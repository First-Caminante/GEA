// --- 1. MOCK DATA & LOCAL STORAGE SETUP ---
const INITIAL_STATE = {
    caja: 15400.50,
    capitalDevuelto: 45000,
    interesesGanados: 12500,
    prestamos: [
        { id: 'p1', cliente: 'Carlos Rodríguez', capital: 5000, interesPrc: 15, garantia: 'Moto Yamaha YBR (Papeles)', fecha: '2023-09-01T10:00:00Z', estado: 'mora', diasAtraso: 14 },
        { id: 'p2', cliente: 'María Fernanda Gómez', capital: 2000, interesPrc: 10, garantia: 'TV LG OLED 55"', fecha: '2023-10-02T14:30:00Z', estado: 'al_dia', diasAtraso: 0 },
        { id: 'p3', cliente: 'Juan Pérez', capital: 8000, interesPrc: 20, garantia: 'Auto Fiat Palio 2014', fecha: '2023-08-15T09:15:00Z', estado: 'mora', diasAtraso: 35 },
        { id: 'p4', cliente: 'Ana Lucía Silva', capital: 1500, interesPrc: 10, garantia: 'Laptop HP Core i7', fecha: '2023-10-05T11:45:00Z', estado: 'al_dia', diasAtraso: 0 },
        { id: 'p5', cliente: 'Roberto Díaz', capital: 3000, interesPrc: 15, garantia: 'Herramientas Construcción', fecha: '2023-09-25T16:20:00Z', estado: 'mora', diasAtraso: 5 }
    ],
    movimientos: [
        { id: 'm1', fecha: new Date().toISOString(), tipo: 'interes', monto: 300, cliente: 'Ana Lucía Silva', detalle: 'Pago Interés Mensual' },
        { id: 'm2', fecha: new Date(Date.now() - 86400000).toISOString(), tipo: 'nuevo_prestamo', monto: -1500, cliente: 'Ana Lucía Silva', detalle: 'Préstamo Entregado' },
        { id: 'm3', fecha: new Date(Date.now() - 172800000).toISOString(), tipo: 'capital', monto: 1000, cliente: 'Luis Torres', detalle: 'Devolución de Capital (Cancelación)' },
        { id: 'm4', fecha: new Date(Date.now() - 259200000).toISOString(), tipo: 'retiro', monto: -500, cliente: '-', detalle: 'Retiro Ganancia Semanal' },
        { id: 'm5', fecha: new Date(Date.now() - 345600000).toISOString(), tipo: 'gasto', monto: -120, cliente: '-', detalle: 'Pago Internet Fibra' }
    ]
};

function getAppState() {
    const saved = localStorage.getItem('prestapp_gea_db');
    if (!saved) {
        localStorage.setItem('prestapp_gea_db', JSON.stringify(INITIAL_STATE));
        return INITIAL_STATE;
    }
    return JSON.parse(saved);
}

function saveAppState(data) {
    localStorage.setItem('prestapp_gea_db', JSON.stringify(data));
    renderApp(); 
}

let app = getAppState();

// --- 2. UTILITY FORMATTERS ---
const formatter = new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const formatMoney = (amount) => 'Bs ' + formatter.format(amount);

const formatDate = (isoString) => {
    const date = new Date(isoString);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    
    if (isToday) {
        return `Hoy, ${date.toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'})}`;
    }
    return date.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }) + ' ' + date.toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'});
};

const genId = () => Math.random().toString(36).substr(2, 9);

// --- 3. RENDER FUNCTIONS ---
function renderApp() {
    renderDashboard();
    renderClientesView();
    renderPrestamosView();
    renderMovimientosView();
    updateSelectPrestamos();
    if (typeof Chart !== 'undefined') {
        renderCharts();
    }
}

function renderDashboard() {
    // Update KPIs
    const capitalEnCalle = app.prestamos.reduce((acc, curr) => acc + curr.capital, 0);
    
    document.getElementById('kpi-caja').innerText = formatMoney(app.caja);
    document.getElementById('kpi-calle').innerText = formatMoney(capitalEnCalle);
    document.getElementById('kpi-devuelto').innerText = formatMoney(app.capitalDevuelto);
    document.getElementById('kpi-intereses').innerText = formatMoney(app.interesesGanados);

    renderPanelMora();
    renderPanelMovimientosDashboard();
}

function renderPanelMora() {
    const listContainer = document.getElementById('mora-list');
    const countBadge = document.getElementById('mora-count');
    
    const moraList = app.prestamos
        .filter(p => p.estado === 'mora')
        .sort((a, b) => b.diasAtraso - a.diasAtraso);

    countBadge.innerText = moraList.length;
    listContainer.innerHTML = '';

    if (moraList.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-10 opacity-70">
                <div class="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i class="fas fa-check text-2xl"></i>
                </div>
                <p class="text-white font-medium">Excelente</p>
                <p class="text-sm text-slate-400">No hay deudores atrasados.</p>
            </div>`;
        return;
    }

    moraList.forEach(p => {
        const totalDeuda = p.capital + (p.capital * (p.interesPrc / 100));
        
        const card = document.createElement('div');
        card.className = 'bg-slate-800/80 border border-slate-700 hover:border-red-500/50 rounded-xl p-4 transition-all group relative overflow-hidden';
        card.innerHTML = `
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
            <div class="flex justify-between items-start mb-3 pl-2">
                <div>
                    <h4 class="font-bold text-white text-[15px] group-hover:text-red-400 transition-colors">${p.cliente}</h4>
                    <div class="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-xs font-bold mt-1.5">
                        <i class="fas fa-clock"></i> ${p.diasAtraso} días atraso
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-lg font-bold text-white">${formatMoney(totalDeuda)}</p>
                    <p class="text-[10px] uppercase text-slate-400 font-semibold">Total a cobrar</p>
                </div>
            </div>
            <div class="pl-2 flex items-center gap-2 mt-2 text-xs text-slate-400 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                <i class="fas fa-lock text-slate-500"></i> <span class="truncate">${p.garantia}</span>
            </div>
            <div class="pl-2 mt-3">
                <button onclick="openCobroDirecto('${p.id}')" class="w-full bg-slate-700 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-bold transition-colors flex justify-center items-center gap-2 group-hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] border border-slate-600 group-hover:border-red-500">
                    <i class="fas fa-bolt text-red-400 group-hover:text-white"></i> Registrar Pago
                </button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

function renderPanelMovimientosDashboard() {
    const tbody = document.getElementById('movimientos-list-dashboard');
    if(!tbody) return;
    tbody.innerHTML = '';
    const recentMovs = [...app.movimientos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 10);
    renderMovimientosToTable(recentMovs, tbody);
}

function renderMovimientosView() {
    const tbody = document.getElementById('movimientos-list-full');
    if(!tbody) return;
    tbody.innerHTML = '';
    const allMovs = [...app.movimientos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    renderMovimientosToTable(allMovs, tbody);
}

function renderMovimientosToTable(movs, tbody) {
    if (movs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500">No hay movimientos registrados</td></tr>';
        return;
    }

    movs.forEach(m => {
        let config = {};
        switch(m.tipo) {
            case 'interes': config = { icon: 'fa-arrow-trend-up', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Interés Cobrado', isPos: true }; break;
            case 'capital': config = { icon: 'fa-arrow-rotate-left', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Devol. Capital', isPos: true }; break;
            case 'nuevo_prestamo': config = { icon: 'fa-handshake', color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20', label: 'Préstamo Dado', isPos: false }; break;
            case 'gasto': config = { icon: 'fa-store', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Gasto Negocio', isPos: false }; break;
            case 'retiro': config = { icon: 'fa-user-minus', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Retiro Personal', isPos: false }; break;
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/60 transition-colors group cursor-default border-b border-slate-700/50 last:border-0';
        tr.innerHTML = `
            <td class="p-4 pl-6 text-slate-400 whitespace-nowrap text-xs font-medium">${formatDate(m.fecha)}</td>
            <td class="p-4">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold ${config.bg} ${config.color} border ${config.border}">
                    <i class="fas ${config.icon}"></i> ${config.label}
                </span>
            </td>
            <td class="p-4">
                <div class="font-semibold text-white text-[13px]">${m.cliente !== '-' ? m.cliente : 'Operación Interna'}</div>
                <div class="text-xs text-slate-400 mt-0.5">${m.detalle}</div>
            </td>
            <td class="p-4 pr-6 text-right font-bold ${config.isPos ? 'text-emerald-400' : 'text-white'} whitespace-nowrap">
                ${config.isPos ? '+' : ''}${formatMoney(Math.abs(m.monto))}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderClientesView() {
    const tbody = document.getElementById('clientes-list-full');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    // Extract unique clients and compute their stats
    const clientStats = {};
    app.prestamos.forEach(p => {
        if (!clientStats[p.cliente]) {
            clientStats[p.cliente] = { name: p.cliente, activeLoans: 0, totalCapital: 0, status: 'al_dia' };
        }
        clientStats[p.cliente].activeLoans++;
        clientStats[p.cliente].totalCapital += p.capital;
        if (p.estado === 'mora') {
            clientStats[p.cliente].status = 'mora';
        }
    });

    const clients = Object.values(clientStats).sort((a, b) => a.name.localeCompare(b.name));

    if (clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500">No hay clientes registrados</td></tr>';
        return;
    }

    clients.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/60 transition-colors group border-b border-slate-700/50 last:border-0';
        const statusBadge = c.status === 'mora' 
            ? '<span class="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-md text-xs font-bold">En Mora</span>'
            : '<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-md text-xs font-bold">Al Día</span>';

        tr.innerHTML = `
            <td class="p-4 pl-6 font-semibold text-white">${c.name}</td>
            <td class="p-4 text-slate-300">${c.activeLoans}</td>
            <td class="p-4 font-bold text-white">${formatMoney(c.totalCapital)}</td>
            <td class="p-4 pr-6 text-right">${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderPrestamosView() {
    const tbody = document.getElementById('prestamos-list-full');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const allPrestamos = [...app.prestamos].sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

    if (allPrestamos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">No hay préstamos activos</td></tr>';
        return;
    }

    allPrestamos.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/60 transition-colors group border-b border-slate-700/50 last:border-0';
        const statusBadge = p.estado === 'mora' 
            ? `<span class="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-md text-xs font-bold">Mora (${p.diasAtraso}d)</span>`
            : '<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-md text-xs font-bold">Al Día</span>';

        tr.innerHTML = `
            <td class="p-4 pl-6 font-semibold text-white">${p.cliente}</td>
            <td class="p-4 text-slate-300">${formatDate(p.fecha)}</td>
            <td class="p-4 font-bold text-white">${formatMoney(p.capital)}</td>
            <td class="p-4 text-brand-400 font-medium">${p.interesPrc}%</td>
            <td class="p-4 text-slate-400 text-xs">${p.garantia}</td>
            <td class="p-4 pr-6 text-right">${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateSelectPrestamos() {
    const select = document.getElementById('pa-prestamo');
    if(!select) return;
    select.innerHTML = '<option value="" disabled selected>Seleccione el cliente / préstamo...</option>';
    
    app.prestamos.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        const total = p.capital + (p.capital * (p.interesPrc / 100));
        opt.textContent = `${p.cliente} — ${p.estado === 'mora' ? '🔴 MORA' : '🟢 AL DÍA'} — Debe: ${formatMoney(total)}`;
        select.appendChild(opt);
    });
}

// --- 4. FORM HANDLERS (LOGIC) ---

function handleNuevoPrestamo(e) {
    e.preventDefault();
    const cliente = document.getElementById('p-cliente').value.trim();
    const capital = parseFloat(document.getElementById('p-monto').value);
    const interes = parseFloat(document.getElementById('p-interes').value);
    const garantia = document.getElementById('p-garantia').value.trim();

    if (app.caja < capital) {
        alert('🚨 ATENCIÓN: No tienes suficiente dinero en caja para este préstamo.');
        return;
    }

    app.caja -= capital;
    app.prestamos.push({
        id: genId(),
        cliente,
        capital,
        interesPrc: interes,
        garantia,
        fecha: new Date().toISOString(),
        estado: 'al_dia',
        diasAtraso: 0
    });

    app.movimientos.push({
        id: genId(),
        fecha: new Date().toISOString(),
        tipo: 'nuevo_prestamo',
        monto: -capital,
        cliente,
        detalle: `Capital: Bs ${capital} | Int: ${interes}%`
    });

    saveAppState(app);
    closeModal();
    e.target.reset();
}

function handleNuevoPago(e) {
    e.preventDefault();
    const idPrestamo = document.getElementById('pa-prestamo').value;
    const tipoPago = document.querySelector('input[name="pa-tipo"]:checked').value;
    const monto = parseFloat(document.getElementById('pa-monto').value);

    if (!idPrestamo) {
        alert('Selecciona un préstamo.');
        return;
    }

    const pIndex = app.prestamos.findIndex(p => p.id === idPrestamo);
    if(pIndex === -1) return;
    const p = app.prestamos[pIndex];

    app.caja += monto;

    if (tipoPago === 'interes') {
        const tiempoStr = document.getElementById('pa-tiempo').value.trim();
        const nuevoInteresStr = document.getElementById('pa-nuevo-interes').value;

        app.interesesGanados += monto;
        p.estado = 'al_dia';
        p.diasAtraso = 0;
        p.fecha = new Date().toISOString(); // Resetea la fecha de emisión a hoy
        
        let detalle = 'Renovación';
        if(tiempoStr) detalle += ` | Plazo: ${tiempoStr}`;
        if(nuevoInteresStr) {
            p.interesPrc = parseFloat(nuevoInteresStr);
            detalle += ` | Nuevo Int: ${p.interesPrc}%`;
        }

        app.movimientos.push({
            id: genId(),
            fecha: new Date().toISOString(),
            tipo: 'interes',
            monto: monto,
            cliente: p.cliente,
            detalle: detalle
        });

    } else if (tipoPago === 'cancelacion') {
        const interesPercibido = monto - p.capital;
        app.capitalDevuelto += p.capital;
        if (interesPercibido > 0) {
            app.interesesGanados += interesPercibido;
            app.movimientos.push({
                id: genId(), fecha: new Date().toISOString(), tipo: 'interes', monto: interesPercibido, cliente: p.cliente, detalle: 'Interés en Cancelación'
            });
        }
        
        app.prestamos.splice(pIndex, 1);
        
        app.movimientos.push({
            id: genId(),
            fecha: new Date().toISOString(),
            tipo: 'capital',
            monto: p.capital,
            cliente: p.cliente,
            detalle: 'Cancelación Total de Capital'
        });
    }

    saveAppState(app);
    closeModal();
    e.target.reset();
}

function handleNuevaSalida(e) {
    e.preventDefault();
    const tipo = document.getElementById('s-tipo').value;
    const detalle = document.getElementById('s-detalle').value.trim();
    const monto = parseFloat(document.getElementById('s-monto').value);

    if (app.caja < monto) {
        alert('🚨 ATENCIÓN: No hay suficiente caja para esta operación.');
        return;
    }

    app.caja -= monto;
    app.movimientos.push({
        id: genId(),
        fecha: new Date().toISOString(),
        tipo: tipo,
        monto: -monto,
        cliente: '-',
        detalle: detalle
    });

    saveAppState(app);
    closeModal();
    e.target.reset();
}

// --- 5. UI VIEWS & MODAL INTERACTIONS ---
function showView(viewId) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
    
    // Deactivate all nav links
    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.remove('bg-brand-500/10', 'text-brand-400', 'border-brand-500/20', 'shadow-inner');
        l.classList.add('text-slate-400', 'hover:bg-slate-700/50', 'hover:text-slate-200', 'border-transparent');
    });

    // Show target view
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    
    // Activate target nav link
    const activeLink = document.getElementById(`nav-${viewId}`);
    if(activeLink) {
        activeLink.classList.remove('text-slate-400', 'hover:bg-slate-700/50', 'hover:text-slate-200', 'border-transparent');
        activeLink.classList.add('bg-brand-500/10', 'text-brand-400', 'border-brand-500/20', 'shadow-inner');
    }

    // Update Header Title
    const titleEl = document.getElementById('view-title');
    const subtitleEl = document.getElementById('view-subtitle');
    if(viewId === 'dashboard') {
        titleEl.innerText = 'Resumen General';
        subtitleEl.innerText = 'Datos actualizados al instante vía localStorage';
    }
    else if(viewId === 'clientes') {
        titleEl.innerText = 'Directorio de Clientes';
        subtitleEl.innerText = 'Visualiza el estado y balance de cada cliente';
    }
    else if(viewId === 'prestamos') {
        titleEl.innerText = 'Listado de Préstamos Activos';
        subtitleEl.innerText = 'Todos los préstamos otorgados y su estado';
    }
    else if(viewId === 'movimientos') {
        titleEl.innerText = 'Historial Completo';
        subtitleEl.innerText = 'Todos los movimientos de ingresos y egresos';
    }
    else if(viewId === 'estadisticas') {
        titleEl.innerText = 'Gráficos y Estadísticas';
        subtitleEl.innerText = 'Análisis financiero del negocio';
        // Resize charts on view change to prevent canvas bugs
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    }

    // Auto-close sidebar on mobile
    if (window.innerWidth < 1024) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
            toggleSidebar();
        }
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    
    if (sidebar.classList.contains('-translate-x-full')) {
        // Open
        sidebar.classList.remove('-translate-x-full');
        backdrop.classList.remove('hidden');
        setTimeout(() => backdrop.classList.remove('opacity-0'), 10);
    } else {
        // Close
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.add('opacity-0');
        setTimeout(() => backdrop.classList.add('hidden'), 300);
    }
}

// Chart variables
let chartCap, chartPrest, chartFlujo;

function renderCharts() {
    const capitalEnCalle = app.prestamos.reduce((acc, curr) => acc + curr.capital, 0);
    
    // Chart 1: Distribución
    const ctxCap = document.getElementById('chart-capital');
    if(ctxCap) {
        if(chartCap) chartCap.destroy();
        chartCap = new Chart(ctxCap, {
            type: 'doughnut',
            data: {
                labels: ['Caja Actual', 'Capital en la Calle'],
                datasets: [{
                    data: [app.caja, capitalEnCalle],
                    backgroundColor: ['#10b981', '#3b82f6'],
                    borderWidth: 0
                }]
            },
            options: { cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }
        });
    }

    // Chart 2: Estado de Préstamos
    const ctxPrest = document.getElementById('chart-prestamos');
    if(ctxPrest) {
        const moraCount = app.prestamos.filter(p => p.estado === 'mora').length;
        const alDiaCount = app.prestamos.filter(p => p.estado === 'al_dia').length;
        if(chartPrest) chartPrest.destroy();
        chartPrest = new Chart(ctxPrest, {
            type: 'pie',
            data: {
                labels: ['Al Día', 'En Mora'],
                datasets: [{
                    data: [alDiaCount, moraCount],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: { plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }
        });
    }

    // Chart 3: Flujo de Operaciones (Totales Acumulados)
    const ctxFlujo = document.getElementById('chart-flujo');
    if(ctxFlujo) {
        const retirosTotales = app.movimientos.filter(m => m.tipo === 'retiro').reduce((acc, m) => acc + Math.abs(m.monto), 0);
        const gastosTotales = app.movimientos.filter(m => m.tipo === 'gasto').reduce((acc, m) => acc + Math.abs(m.monto), 0);
        
        if(chartFlujo) chartFlujo.destroy();
        chartFlujo = new Chart(ctxFlujo, {
            type: 'bar',
            data: {
                labels: ['Int. Ganados', 'Cap. Devuelto', 'Gastos Negocio', 'Retiros Personales'],
                datasets: [{
                    label: 'Monto Acumulado (Bs)',
                    data: [app.interesesGanados, app.capitalDevuelto, gastosTotales, retirosTotales],
                    backgroundColor: ['#f59e0b', '#8b5cf6', '#f43f5e', '#f97316'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                }
            }
        });
    }
}

function openModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    const actionModal = document.getElementById('actionModal');
    
    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('flex');
    void modalOverlay.offsetWidth;
    
    modalOverlay.classList.remove('opacity-0');
    actionModal.classList.remove('hidden', 'scale-95');
    actionModal.classList.add('flex', 'scale-100');
    
    switchTab('tab-prestamo');
}

function closeModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    const actionModal = document.getElementById('actionModal');

    modalOverlay.classList.add('opacity-0');
    actionModal.classList.remove('scale-100');
    actionModal.classList.add('scale-95');
    
    setTimeout(() => {
        modalOverlay.classList.add('hidden');
        modalOverlay.classList.remove('flex');
        actionModal.classList.add('hidden');
        actionModal.classList.remove('flex');
    }, 300);
}

document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
});

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    
    const btns = [
        {id: 'btn-tab-prestamo', activeClass: 'bg-brand-500 text-white', defaultClass: 'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'},
        {id: 'btn-tab-pago', activeClass: 'bg-emerald-500 text-white', defaultClass: 'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'},
        {id: 'btn-tab-salida', activeClass: 'bg-rose-500 text-white', defaultClass: 'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
    ];

    btns.forEach(b => {
        const btn = document.getElementById(b.id);
        b.activeClass.split(' ').forEach(cls => btn.classList.remove(cls));
        b.defaultClass.split(' ').forEach(cls => btn.classList.add(cls));
    });

    document.getElementById(`form-${tabName.split('-')[1]}`).classList.remove('hidden');

    const activeBtnData = btns.find(b => b.id === `btn-${tabName}`);
    const activeBtn = document.getElementById(activeBtnData.id);
    activeBtnData.defaultClass.split(' ').forEach(cls => activeBtn.classList.remove(cls));
    activeBtnData.activeClass.split(' ').forEach(cls => activeBtn.classList.add(cls));
}

function openCobroDirecto(idPrestamo) {
    openModal();
    switchTab('tab-pago');
    document.getElementById('pa-prestamo').value = idPrestamo;
    document.querySelector('input[name="pa-tipo"][value="interes"]').checked = true;
    
    const p = app.prestamos.find(x => x.id === idPrestamo);
    if(p) {
        const interes = p.capital * (p.interesPrc / 100);
        document.getElementById('pa-monto').value = interes;
    }
}

// Listener para Mostrar/Ocultar campos de Renovación
document.querySelectorAll('input[name="pa-tipo"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const divRenovacion = document.getElementById('campos-renovacion');
        if(divRenovacion) {
            if(e.target.value === 'interes') {
                divRenovacion.classList.remove('hidden');
            } else {
                divRenovacion.classList.add('hidden');
            }
        }
    });
});

// INIT
document.addEventListener('DOMContentLoaded', () => {
    renderApp();
    showView('dashboard'); // Default view
});
