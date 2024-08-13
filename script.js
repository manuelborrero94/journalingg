// Función para cambiar entre pestañas
function openTab(event, tabId) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => {
        tab.classList.remove('active');
    });

    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Función para manejar el envío del formulario
function handleSubmit(event) {
    event.preventDefault();

    const form = document.getElementById('operationForm');
    const formData = new FormData(form);
    const operation = {};

    formData.forEach((value, key) => {
        if (key === 'photo') {
            const file = formData.get('photo');
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    operation[key] = e.target.result;
                    saveOperation(operation);
                };
                reader.readAsDataURL(file);
            } else {
                operation[key] = null;
                saveOperation(operation);
            }
        } else {
            operation[key] = value;
        }
    });

    function saveOperation(operation) {
        // Guardar la operación en localStorage
        let operations = JSON.parse(localStorage.getItem('operations')) || [];
        operations.push(operation);
        localStorage.setItem('operations', JSON.stringify(operations));

        // Limpiar el formulario
        form.reset();

        // Actualizar la tabla de historial y las métricas de análisis
        updateOperationsTable();
        updateAnalysisMetrics();
    }
}

// Función para calcular el beneficio/pérdida
function calculateProfitLoss(op) {
    const entryPrice = parseFloat(op.entryPrice);
    const exitPrice = parseFloat(op.exitPrice || entryPrice);
    const contracts = parseFloat(op.contracts);
    const pointValue = 20; // Valor de cada punto en dólares

    if (op.operationType === 'venta') {
        return (entryPrice - exitPrice) * contracts * pointValue;
    } else if (op.operationType === 'compra') {
        return (exitPrice - entryPrice) * contracts * pointValue;
    } else {
        return 0;
    }
}

// Función para aplicar filtros y actualizar la tabla
function applyFilters() {
    const search = document.getElementById('filterSearch').value.toLowerCase();
    const asset = document.getElementById('filterAsset').value.toLowerCase();
    const type = document.getElementById('filterType').value;
    const fromDate = document.getElementById('filterFromDate').value;
    const toDate = document.getElementById('filterToDate').value;
    const minPrice = parseFloat(document.getElementById('filterMinPrice').value) || -Infinity;
    const maxPrice = parseFloat(document.getElementById('filterMaxPrice').value) || Infinity;

    let operations = JSON.parse(localStorage.getItem('operations')) || [];
    let filteredOperations = operations.filter(op => {
        const opDate = new Date(op.date);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;
        const profitLoss = calculateProfitLoss(op);

        return (
            (!search || op.asset.toLowerCase().includes(search) || op.date.includes(search)) &&
            (!asset || op.asset.toLowerCase().includes(asset)) &&
            (type === 'todos' || op.operationType === type) &&
            (!from || opDate >= from) &&
            (!to || opDate <= to) &&
            (profitLoss >= minPrice) &&
            (profitLoss <= maxPrice)
        );
    });

    displayOperations(filteredOperations);
}

// Función para mostrar operaciones en la tabla
function displayOperations(operations) {
    const table = document.getElementById('operationsTable');
    table.innerHTML = '';

    if (operations.length === 0) {
        table.innerHTML = '<p>No hay operaciones que mostrar.</p>';
        return;
    }

    const tableHtml = `
        <table border="1">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Activo</th>
                    <th>Tipo de Operación</th>
                    <th>Contratos</th>
                    <th>Precio de Entrada</th>
                    <th>Precio de Salida</th>
                    <th>Take Profit</th>
                    <th>Stop Loss</th>
                    <th>Balance Inicial</th>
                    <th>Foto</th>
                    <th>Beneficio/Pérdida</th>
                </tr>
            </thead>
            <tbody>
                ${operations.map(op => {
                    const profitLoss = calculateProfitLoss(op);

                    return `
                        <tr>
                            <td>${op.date}</td>
                            <td>${op.asset}</td>
                            <td>${op.operationType}</td>
                            <td>${op.contracts}</td>
                            <td>${parseFloat(op.entryPrice).toFixed(2)}</td>
                            <td>${parseFloat(op.exitPrice || op.entryPrice).toFixed(2)}</td>
                            <td>${op.takeProfit || 'N/A'}</td>
                            <td>${op.stopLoss || 'N/A'}</td>
                            <td>${op.initialBalance}</td>
                            <td>${op.photo ? `<img src="${op.photo}" alt="Foto">` : 'N/A'}</td>
                            <td>${profitLoss.toFixed(2)}</td>
                        </tr>
                    `;
                }).join('')}
                <tr>
                    <td colspan="10"><strong>Total:</strong></td>
                    <td><strong>${operations.reduce((total, op) => total + calculateProfitLoss(op), 0).toFixed(2)}</strong></td>
                </tr>
            </tbody>
        </table>
    `;

    table.innerHTML = tableHtml;
}

// Función para calcular y actualizar las métricas de análisis
function updateAnalysisMetrics() {
    let operations = JSON.parse(localStorage.getItem('operations')) || [];

    if (operations.length === 0) {
        document.getElementById('successRate').textContent = '0.00%';
        document.getElementById('avgProfitLoss').textContent = '0.00';
        document.getElementById('totalOperations').textContent = '0';
        document.getElementById('riskRewardRatio').textContent = '0.00';
        return;
    }

    let totalTrades = operations.length;
    let successfulOperations = 0;
    let totalProfitLoss = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    const pointValue = 20; // Valor de cada punto en dólares

    operations.forEach(op => {
        const profitLoss = calculateProfitLoss(op);

        totalProfitLoss += profitLoss;

        if (profitLoss > 0) {
            successfulOperations++;
            totalProfit += profitLoss;
        } else {
            totalLoss += profitLoss;
        }
    });

    const successRate = (totalTrades > 0) ? (successfulOperations / totalTrades) * 100 : 0;
    const avgProfitLoss = (totalTrades > 0) ? totalProfitLoss / totalTrades : 0;
    const avgProfit = (successfulOperations > 0) ? totalProfit / successfulOperations : 0;
    const avgLoss = (totalTrades - successfulOperations > 0) ? totalLoss / (totalTrades - successfulOperations) : 0;
    const riskRewardRatio = (avgLoss !== 0) ? (avgProfit / -avgLoss) : 0;

    document.getElementById('successRate').textContent = `${successRate.toFixed(2)}%`;
    document.getElementById('avgProfitLoss').textContent = avgProfitLoss.toFixed(2);
    document.getElementById('totalOperations').textContent = totalTrades;
    document.getElementById('riskRewardRatio').textContent = riskRewardRatio.toFixed(2);

    // Mostrar gráfico de rendimiento
    displayPerformanceChart(operations);
}

// Función para mostrar gráfico de rendimiento
function displayPerformanceChart(operations) {
    const ctx = document.getElementById('performanceChart').getContext('2d');

    const labels = operations.map(op => op.date);
    const data = operations.map(op => calculateProfitLoss(op));

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Beneficio/Pérdida',
                data: data,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Fecha'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Beneficio/Pérdida'
                    }
                }
            }
        }
    });
}

// Inicializar la tabla de historial y las métricas de análisis al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    updateOperationsTable();
    updateAnalysisMetrics();

    // Añadir eventos de filtro
    document.getElementById('filterSearch').addEventListener('input', applyFilters);
    document.getElementById('filterAsset').addEventListener('change', applyFilters);
    document.getElementById('filterType').addEventListener('change', applyFilters);
    document.getElementById('filterFromDate').addEventListener('change', applyFilters);
    document.getElementById('filterToDate').addEventListener('change', applyFilters);
    document.getElementById('filterMinPrice').addEventListener('input', applyFilters);
    document.getElementById('filterMaxPrice').addEventListener('input', applyFilters);
});
