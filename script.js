(function() {
    // --- DATABASE LOCAL ---
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
        // ANTI-CACHE HTML: Si el HTML viejo no tiene las pestañas, forzar recarga dura
        if (!document.querySelector('.dueno-nav')) {
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
                        <button class="btn-gestion" onclick="abrirModal('${e.id}', '${e.nombre}')"><i class="ri-settings-3-line"></i> Gestionar</button>
                        <button style="background:none;border:none;color:var(--error);cursor:pointer;" onclick="delEmp('${e.id}')"><i class="ri-delete-bin-line"></i></button>
                    </div>
                </div>
            `).join('');

            const tLive = document.getElementById('turnoLive');
            if(db.turno && db.turno.nombre) {
                tLive.innerHTML = `
                    <div style="color:var(--success); font-weight:bold; margin-bottom:10px;"><i class="ri-record-circle-line pulse"></i> Turno Activo</div>
                    <div><strong>Empleado:</strong> ${db.turno.nombre}</div>
                    <div><strong>Ingreso:</strong> ${db.turno.hora}</div>
                    <div><strong>Caja Inicial:</strong> $${db.turno.caja}</div>
                `;
            } else {
                tLive.innerHTML = '<div style="color:var(--text-dim);">No hay turnos activos actualmente.</div>';
            }

            // 2. ADMIN PRODUCTOS
            const pTable = document.getElementById('productosTable');
            pTable.innerHTML = db.productos.map(p => `
                <tr>
                    <td><strong>${p.nombre}</strong></td>
                    <td style="${p.stock <= 5 ? 'color:var(--error);font-weight:bold;' : 'color:var(--success);'}">${p.stock}</td>
                    <td>$${p.precio}</td>
                    <td><button style="background:none;border:none;color:var(--error);cursor:pointer;" onclick="delProd('${p.id}')"><i class="ri-delete-bin-line"></i></button></td>
                </tr>
            `).join('');

            // 3. ADMIN VENTAS (Historial General)
            const vTable = document.getElementById('ventasAllTable');
            let totalGeneral = 0;
            vTable.innerHTML = '';
            db.ventas.forEach(v => {
                totalGeneral += parseFloat(v.total);
                vTable.innerHTML += `
                    <tr>
                        <td style="font-size:0.8rem; color:var(--text-dim);">${v.fecha}<br>${v.hora}</td>
                        <td>${v.vendedor}</td>
                        <td>${v.productoNombre}</td>
                        <td>x${v.cantidad}</td>
                        <td style="color:var(--success); font-weight:bold;">$${v.total}</td>
                    </tr>
                `;
            });
            document.getElementById('totalVentasGlobal').innerText = totalGeneral.toFixed(2);

            // Modal Update
            if(activeEmpId) renderModal(activeEmpId);
        };

        // EVENTOS EMPLEADO
        document.getElementById('formAddEmpleado').addEventListener('submit', (e) => {
            e.preventDefault();
            const db = getDB();
            db.empleados.push({ id: 'E'+Date.now(), nombre: document.getElementById('d_nombreEmp').value });
            saveDB('vp_empleados', db.empleados);
            e.target.reset();
        });
        window.delEmp = (id) => {
            if(!confirm("¿Eliminar empleado?")) return;
            let db = getDB();
            db.empleados = db.empleados.filter(e => e.id !== id);
            saveDB('vp_empleados', db.empleados);
        };

        // EVENTOS PRODUCTO
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
            alert("Producto guardado");
        });
        window.delProd = (id) => {
            if(!confirm("¿Eliminar producto?")) return;
            let db = getDB();
            db.productos = db.productos.filter(p => p.id !== id);
            saveDB('vp_productos', db.productos);
        }

        // EVENTOS MODAL
        window.abrirModal = (id, nombre) => {
            activeEmpId = id;
            document.getElementById('modalEmpTitle').innerHTML = `<i class="ri-user-star-line"></i> Gestión: ${nombre}`;
            document.getElementById('modalEmp').style.display = 'flex';
            renderModal(id);
        };
        window.cerrarModal = () => { activeEmpId = null; document.getElementById('modalEmp').style.display = 'none'; };
        const renderModal = (empId) => {
            const db = getDB();
            const myObjs = db.objetivos.filter(o => o.empId === empId);
            document.getElementById('modalObjList').innerHTML = myObjs.map(o => `
                <div class="mini-item ${o.estado === 'cumplido' ? 'cumplido' : ''}" style="${o.estado === 'cumplido' ? 'border-color:var(--success);' : ''}">
                    <span style="${o.estado === 'cumplido' ? 'text-decoration:line-through;color:var(--text-dim);' : ''}">${o.texto}</span>
                    <button style="background:none;border:none;color:var(--error);cursor:pointer;" onclick="delObj('${o.id}')"><i class="ri-delete-bin-line"></i></button>
                </div>
            `).join('') || '<div style="color:var(--text-dim); font-size:0.8rem;">Sin objetivos asignados</div>';

            const myMsgs = db.mensajes.filter(m => m.empId === empId);
            document.getElementById('modalMsgList').innerHTML = myMsgs.map(m => `
                <div class="mini-item" style="border-left: 3px solid var(--success);">
                    <span style="font-size:0.85rem;">${m.texto}</span>
                    <button style="background:none;border:none;color:var(--error);cursor:pointer;" onclick="delMsg('${m.id}')"><i class="ri-delete-bin-line"></i></button>
                </div>
            `).join('') || '<div style="color:var(--text-dim); font-size:0.8rem;">No hay mensajes</div>';
        };
        document.getElementById('formAddObj').addEventListener('submit', (e) => { e.preventDefault(); if(!activeEmpId) return; const db = getDB(); db.objetivos.push({ id: 'O'+Date.now(), empId: activeEmpId, texto: document.getElementById('d_objTexto').value, estado: 'pendiente' }); saveDB('vp_objetivos', db.objetivos); e.target.reset(); });
        document.getElementById('formAddMsg').addEventListener('submit', (e) => { e.preventDefault(); if(!activeEmpId) return; const db = getDB(); db.mensajes.push({ id: 'M'+Date.now(), empId: activeEmpId, texto: document.getElementById('d_msgTexto').value }); saveDB('vp_mensajes', db.mensajes); e.target.reset(); });
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
        // ANTI-CACHE HTML: Si el HTML viejo no tiene el selector de productos, forzar recarga dura
        if (!document.getElementById('v_productoId')) {
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

                // Select Productos (Solo con stock)
                const sProd = document.getElementById('v_productoId');
                const currProd = sProd.value;
                sProd.innerHTML = '<option value="">-- Elige un producto --</option>' + db.productos.map(p => {
                    const disabled = p.stock <= 0 ? 'disabled' : '';
                    const stockMsg = p.stock <= 0 ? '(Agotado)' : `(Stock: ${p.stock})`;
                    return `<option value="${p.id}" ${disabled}>${p.nombre} - $${p.precio} ${stockMsg}</option>`;
                }).join('');
                if(currProd) sProd.value = currProd;

                // Objetivos y Mensajes
                const myObjs = db.objetivos.filter(o => o.empId === db.turno.empId);
                document.getElementById('e_objetivos').innerHTML = myObjs.length > 0 ? myObjs.map(o => `
                    <div class="obj-card ${o.estado === 'cumplido' ? 'cumplido' : ''}">
                        <div class="obj-text">${o.texto}</div>
                        ${o.estado !== 'cumplido' ? `<button onclick="cumplirObj('${o.id}')" style="background:var(--success);color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;font-weight:bold;">Completar</button>` : '✅'}
                    </div>
                `).join('') : '<div style="color:var(--text-dim);font-size:0.9rem;">No tienes objetivos pendientes.</div>';

                const myMsgs = db.mensajes.filter(m => m.empId === db.turno.empId);
                document.getElementById('e_mensajes').innerHTML = myMsgs.length > 0 ? myMsgs.map(m => `
                    <div class="obj-card" style="border-left-color:var(--success); background:#10b98111;">
                        <div class="obj-text"><i class="ri-chat-1-line"></i> ${m.texto}</div>
                    </div>
                `).join('') : '<div style="color:var(--text-dim);font-size:0.9rem;">Sin mensajes nuevos.</div>';

            } else {
                scrIni.style.display = 'block';
                scrAct.style.display = 'none';
                const selectEmp = document.getElementById('e_empId');
                const currVal = selectEmp.value;
                selectEmp.innerHTML = '<option value="">-- Selecciona --</option>' + db.empleados.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
                if(currVal) selectEmp.value = currVal;
            }
        };

        // Iniciar Turno
        document.getElementById('formTurno').addEventListener('submit', (e) => {
            e.preventDefault();
            const db = getDB();
            const selectEmp = document.getElementById('e_empId');
            const empId = selectEmp.value;
            const empData = db.empleados.find(x => x.id === empId);
            
            saveDB('vp_turno', {
                empId: empId,
                nombre: empData ? empData.nombre : 'Desconocido',
                caja: document.getElementById('e_cajaIni').value,
                hora: new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})
            });
            renderEmpleado();
        });

        // Registrar Venta (Descontar Stock y Calcular Precio)
        document.getElementById('formVenta').addEventListener('submit', (e) => {
            e.preventDefault();
            let db = getDB();
            const prodId = document.getElementById('v_productoId').value;
            const cantidad = parseInt(document.getElementById('v_cantidad').value);

            if(!prodId) return alert("Selecciona un producto");

            // Buscar producto
            let prodIndex = db.productos.findIndex(p => p.id === prodId);
            if(prodIndex === -1) return alert("Producto no encontrado");

            let producto = db.productos[prodIndex];

            // Validar Stock
            if(producto.stock < cantidad) {
                return alert(`No hay stock suficiente. Solo quedan ${producto.stock} unidades.`);
            }

            // Descontar Stock
            db.productos[prodIndex].stock -= cantidad;
            saveDB('vp_productos', db.productos);

            // Registrar Venta
            const total = (parseFloat(producto.precio) * cantidad).toFixed(2);
            db.ventas.unshift({
                id: 'V'+Date.now(),
                fecha: new Date().toLocaleDateString('es-ES'),
                hora: new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'}),
                vendedor: db.turno.nombre,
                productoNombre: producto.nombre,
                cantidad: cantidad,
                total: total
            });
            saveDB('vp_ventas', db.ventas);
            
            e.target.reset();
            alert(`✅ Venta registrada: $${total}\nStock restante: ${db.productos[prodIndex].stock}`);
        });

        window.cumplirObj = (id) => { const db = getDB(); const obj = db.objetivos.find(o => o.id === id); if(obj) { obj.estado = 'cumplido'; saveDB('vp_objetivos', db.objetivos); } };
        window.cerrarTurno = () => { if(confirm("¿Estás seguro de cerrar el turno?")) { localStorage.removeItem('vp_turno'); window.dispatchEvent(new Event('storage')); renderEmpleado(); } };

        window.addEventListener('storage', renderEmpleado);
        setInterval(renderEmpleado, 1500);
        renderEmpleado();
    }
})();