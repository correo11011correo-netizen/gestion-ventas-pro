(function() {
    const getDB = () => ({
        empleados: JSON.parse(localStorage.getItem('vp_empleados')) || [],
        turno: JSON.parse(localStorage.getItem('vp_turno')) || null,
        ventas: JSON.parse(localStorage.getItem('vp_ventas')) || [],
        objetivos: JSON.parse(localStorage.getItem('vp_objetivos')) || [],
        mensajes: JSON.parse(localStorage.getItem('vp_mensajes')) || [],
        productos: JSON.parse(localStorage.getItem('vp_productos')) || []
    });

    const saveDB = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
        window.dispatchEvent(new Event('storage'));
    };

    const ROLE = document.body.getAttribute('data-role');

    // ==========================================
    // PANEL DUEÑO
    // ==========================================
    if (ROLE === 'dueno') {
        // ANTI-CACHE HTML: Forzar recarga si faltan elementos nuevos (como stats-grid)
        if (!document.querySelector('.dueno-nav') || !document.querySelector('.stats-grid')) {
            window.location.replace(window.location.pathname + '?nocache=' + Date.now());
            return;
        }

        let activeEmpId = null;

        window.switchTab = (tabId) => {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(`tab-${tabId}`).classList.add('active');
            event.currentTarget.classList.add('active');
        };

        const renderDueno = () => {
            const db = getDB();
            
            // 1. ADMIN EMPLEADOS
            const le = document.getElementById('listaEmpleados');
            le.innerHTML = db.empleados.map(e => `
                <div class="mini-item">
                    <span><i class="ri-user-line"></i> ${e.nombre}</span>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-gestion" onclick="abrirModal('${e.id}', '${e.nombre}')"><i class="ri-settings-3-line"></i></button>
                        <button style="background:none;border:none;color:var(--error);cursor:pointer;" onclick="delEmp('${e.id}')"><i class="ri-delete-bin-line"></i></button>
                    </div>
                </div>
            `).join('');

            const tLive = document.getElementById('turnoLive');
            if(db.turno && db.turno.nombre) {
                tLive.innerHTML = `
                    <div style="color:var(--success); font-weight:bold; margin-bottom:10px;"><i class="ri-record-circle-line pulse"></i> En Turno: ${db.turno.nombre}</div>
                    <div style="font-size:0.9rem;"><strong>Ingreso:</strong> ${db.turno.hora} | <strong>Caja:</strong> $${db.turno.caja}</div>
                `;
            } else {
                tLive.innerHTML = '<div style="color:var(--text-dim);">Esperando conexión...</div>';
            }

            // 2. ADMIN PRODUCTOS
            const pTable = document.getElementById('productosTable');
            pTable.innerHTML = db.productos.map(p => `
                <tr>
                    <td><strong>${p.nombre}</strong></td>
                    <td style="${p.stock <= 3 ? 'color:var(--error);font-weight:bold;' : 'color:var(--success);'}">${p.stock}</td>
                    <td>$${p.precio}</td>
                    <td><button style="background:none;border:none;color:var(--error);cursor:pointer;" onclick="delProd('${p.id}')"><i class="ri-delete-bin-line"></i></button></td>
                </tr>
            `).join('');

            // 3. ADMIN VENTAS & ANALYTICS
            const vTable = document.getElementById('ventasAllTable');
            let total = 0;
            const rankingProd = {};
            const rankingEmp = {};

            vTable.innerHTML = '';
            db.ventas.forEach(v => {
                total += parseFloat(v.total);
                // Analytics
                rankingProd[v.productoNombre] = (rankingProd[v.productoNombre] || 0) + parseInt(v.cantidad);
                rankingEmp[v.vendedor] = (rankingEmp[v.vendedor] || 0) + parseFloat(v.total);
                
                vTable.innerHTML += `
                    <tr>
                        <td style="font-size:0.75rem;">${v.fecha} ${v.hora}</td>
                        <td style="font-weight:bold;">${v.vendedor}</td>
                        <td>${v.productoNombre}</td>
                        <td>x${v.cantidad}</td>
                        <td style="color:var(--success);">$${v.total}</td>
                    </tr>
                `;
            });

            document.getElementById('totalVentasGlobal').innerText = total.toFixed(2);
            
            // Calc Top Producto
            const topP = Object.entries(rankingProd).sort((a,b) => b[1]-a[1])[0];
            document.getElementById('topProducto').innerText = topP ? `${topP[0]} (${topP[1]})` : '-';

            // Calc Top Vendedor
            const topV = Object.entries(rankingEmp).sort((a,b) => b[1]-a[1])[0];
            document.getElementById('topVendedor').innerText = topV ? `${topV[0]} ($${topV[1].toFixed(2)})` : '-';

            if(activeEmpId) renderModal(activeEmpId);
        };

        // Eventos...
        document.getElementById('formAddEmpleado').addEventListener('submit', (e) => {
            e.preventDefault();
            const db = getDB();
            db.empleados.push({ id: 'E'+Date.now(), nombre: document.getElementById('d_nombreEmp').value });
            saveDB('vp_empleados', db.empleados);
            e.target.reset();
        });

        document.getElementById('formAddProducto').addEventListener('submit', (e) => {
            e.preventDefault();
            const db = getDB();
            db.productos.push({
                id: 'P'+Date.now(),
                nombre: document.getElementById('p_nombre').value,
                precio: parseFloat(document.getElementById('p_precio').value).toFixed(2),
                stock: parseInt(document.getElementById('p_stock').value)
            });
            saveDB('vp_productos', db.productos);
            e.target.reset();
        });

        window.delEmp = (id) => { if(confirm("¿Eliminar?")) { let db = getDB(); saveDB('vp_empleados', db.empleados.filter(e => e.id !== id)); } };
        window.delProd = (id) => { if(confirm("¿Eliminar?")) { let db = getDB(); saveDB('vp_productos', db.productos.filter(p => p.id !== id)); } };

        window.abrirModal = (id, nombre) => {
            activeEmpId = id;
            document.getElementById('modalEmpTitle').innerText = nombre;
            document.getElementById('modalEmp').style.display = 'flex';
            renderModal(id);
        };
        window.cerrarModal = () => { activeEmpId = null; document.getElementById('modalEmp').style.display = 'none'; };

        const renderModal = (empId) => {
            const db = getDB();
            const myObjs = db.objetivos.filter(o => o.empId === empId);
            document.getElementById('modalObjList').innerHTML = myObjs.map(o => `
                <div class="mini-item">
                    <span style="${o.estado === 'cumplido' ? 'text-decoration:line-through;color:var(--text-dim);' : ''}">${o.texto}</span>
                    <button style="background:none;border:none;color:var(--error);" onclick="delObj('${o.id}')"><i class="ri-delete-bin-line"></i></button>
                </div>
            `).join('') || '<div style="color:var(--text-dim);">Sin objetivos</div>';

            const myMsgs = db.mensajes.filter(m => m.empId === empId);
            document.getElementById('modalMsgList').innerHTML = myMsgs.map(m => `
                <div class="mini-item" style="border-left: 3px solid var(--success);">
                    <span>${m.texto}</span>
                    <button style="background:none;border:none;color:var(--error);" onclick="delMsg('${m.id}')"><i class="ri-delete-bin-line"></i></button>
                </div>
            `).join('') || '<div style="color:var(--text-dim);">Sin mensajes</div>';
        };

        document.getElementById('formAddObj').addEventListener('submit', (e) => { e.preventDefault(); const db = getDB(); db.objetivos.push({ id: 'O'+Date.now(), empId: activeEmpId, texto: document.getElementById('d_objTexto').value, estado: 'pendiente' }); saveDB('vp_objetivos', db.objetivos); e.target.reset(); });
        document.getElementById('formAddMsg').addEventListener('submit', (e) => { e.preventDefault(); const db = getDB(); db.mensajes.push({ id: 'M'+Date.now(), empId: activeEmpId, texto: document.getElementById('d_msgTexto').value }); saveDB('vp_mensajes', db.mensajes); e.target.reset(); });
        window.delObj = (id) => { let db = getDB(); saveDB('vp_objetivos', db.objetivos.filter(o => o.id !== id)); };
        window.delMsg = (id) => { let db = getDB(); saveDB('vp_mensajes', db.mensajes.filter(m => m.id !== id)); };

        window.addEventListener('storage', renderDueno);
        setInterval(renderDueno, 1500);
        renderDueno();
    }

    // ==========================================
    // PANEL EMPLEADO
    // ==========================================
    if (ROLE === 'empleado') {
        if (!document.getElementById('v_productos_grid')) {
            window.location.replace(window.location.pathname + '?nocache=' + Date.now());
            return;
        }

        const renderEmpleado = () => {
            const db = getDB();
            const scrIni = document.getElementById('screen-iniciar');
            const scrAct = document.getElementById('screen-activo');

            if (db.turno && db.turno.empId) {
                scrIni.style.display = 'none';
                scrAct.style.display = 'block';
                document.getElementById('e_nombreActivo').innerText = db.turno.nombre;

                const gridProd = document.getElementById('v_productos_grid');
                if (gridProd) {
                    const newGridHTML = db.productos.map(p => `
                        <button class="prod-btn" ${p.stock <= 0 ? 'disabled' : ''} onclick="venderRapido('${p.id}')">
                            <span class="p-name">${p.nombre}</span>
                            <span class="p-price">$${p.precio}</span>
                            <span class="p-stock">Stock: ${p.stock}</span>
                        </button>
                    `).join('');
                    
                    // Solo actualizar si hay cambios visuales para no parpadear
                    if (gridProd.innerHTML !== newGridHTML) {
                        gridProd.innerHTML = newGridHTML;
                    }
                }

                const myObjs = db.objetivos.filter(o => o.empId === db.turno.empId);
                document.getElementById('e_objetivos').innerHTML = myObjs.map(o => `
                    <div class="obj-card ${o.estado === 'cumplido' ? 'cumplido' : ''}">
                        <div class="obj-text">${o.texto}</div>
                        ${o.estado !== 'cumplido' ? `<button onclick="cumplirObj('${o.id}')" style="background:var(--success);color:white;border:none;padding:5px 10px;border-radius:5px;">Ok</button>` : '✅'}
                    </div>
                `).join('') || 'Sin objetivos.';

                const myMsgs = db.mensajes.filter(m => m.empId === db.turno.empId);
                document.getElementById('e_mensajes').innerHTML = myMsgs.map(m => `<div class="obj-card" style="border-left-color:var(--success); background:#10b98111;"><div class="obj-text">${m.texto}</div></div>`).join('') || 'Sin mensajes.';
            } else {
                scrIni.style.display = 'block';
                scrAct.style.display = 'none';
                const selectEmp = document.getElementById('e_empId');
                if (selectEmp.children.length !== (db.empleados.length + 1)) {
                    const currentVal = selectEmp.value;
                    selectEmp.innerHTML = '<option value="">-- ¿Quién eres? --</option>' + db.empleados.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
                    selectEmp.value = currentVal;
                }
            }
        };

        document.getElementById('formTurno').addEventListener('submit', (e) => {
            e.preventDefault();
            const db = getDB();
            const s = document.getElementById('e_empId');
            const emp = db.empleados.find(x => x.id === s.value);
            saveDB('vp_turno', { empId: s.value, nombre: emp.nombre, caja: document.getElementById('e_cajaIni').value, hora: new Date().toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}) });
            renderEmpleado();
        });

        window.venderRapido = (pId) => {
            let db = getDB();
            const pIdx = db.productos.findIndex(x => x.id === pId);
            const prod = db.productos[pIdx];

            if (prod.stock < 1) return alert("¡No hay stock suficiente!");

            db.productos[pIdx].stock -= 1;
            saveDB('vp_productos', db.productos);

            const total = parseFloat(prod.precio).toFixed(2);
            db.ventas.unshift({ id: 'V'+Date.now(), fecha: new Date().toLocaleDateString('es-ES'), hora: new Date().toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}), vendedor: db.turno.nombre, productoNombre: prod.nombre, cantidad: 1, total: total });
            saveDB('vp_ventas', db.ventas);
        };

        window.cumplirObj = (id) => { const db = getDB(); const o = db.objetivos.find(x => x.id === id); if(o){ o.estado = 'cumplido'; saveDB('vp_objetivos', db.objetivos); } };
        window.cerrarTurno = () => { if(confirm("Cerrar?")){ localStorage.removeItem('vp_turno'); window.dispatchEvent(new Event('storage')); renderEmpleado(); } };

        window.addEventListener('storage', renderEmpleado);
        setInterval(renderEmpleado, 1500);
        renderEmpleado();
    }
})();