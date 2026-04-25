(function() {
    // --- DATABASE LOCAL ---
    const getDB = () => ({
        empleados: JSON.parse(localStorage.getItem('vp_empleados')) || [],
        turno: JSON.parse(localStorage.getItem('vp_turno')) || null,
        ventas: JSON.parse(localStorage.getItem('vp_ventas')) || [],
        objetivos: JSON.parse(localStorage.getItem('vp_objetivos')) || [],
        mensajes: JSON.parse(localStorage.getItem('vp_mensajes')) || []
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
        let activeEmpId = null;

        const renderDueno = () => {
            const db = getDB();
            
            // 1. Render Lista Empleados
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

            // 2. Render Turno Live
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

            // 3. Render Ventas
            const vTable = document.getElementById('ventasTable');
            let total = 0;
            vTable.innerHTML = '';
            db.ventas.forEach(v => {
                total += parseFloat(v.monto);
                vTable.innerHTML += `<tr><td>${v.hora}</td><td>${v.desc}</td><td style="color:var(--success); font-weight:bold;">$${v.monto}</td></tr>`;
            });
            document.getElementById('totalVentas').innerText = total.toFixed(2);

            // 4. Actualizar Modal si está abierto
            if(activeEmpId) renderModal(activeEmpId);
        };

        // ALTA EMPLEADO
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

        // --- LÓGICA DEL MODAL DE GESTIÓN ---
        window.abrirModal = (id, nombre) => {
            activeEmpId = id;
            document.getElementById('modalEmpTitle').innerHTML = `<i class="ri-user-star-line"></i> Gestión: ${nombre}`;
            document.getElementById('modalEmp').style.display = 'flex';
            renderModal(id);
        };

        window.cerrarModal = () => {
            activeEmpId = null;
            document.getElementById('modalEmp').style.display = 'none';
        };

        const renderModal = (empId) => {
            const db = getDB();
            
            // Filtrar y renderizar Objetivos del empleado
            const myObjs = db.objetivos.filter(o => o.empId === empId);
            document.getElementById('modalObjList').innerHTML = myObjs.map(o => `
                <div class="mini-item ${o.estado === 'cumplido' ? 'cumplido' : ''}" style="${o.estado === 'cumplido' ? 'border-color:var(--success);' : ''}">
                    <span style="${o.estado === 'cumplido' ? 'text-decoration:line-through;color:var(--text-dim);' : ''}">${o.texto}</span>
                    <button style="background:none;border:none;color:var(--error);cursor:pointer;" onclick="delObj('${o.id}')"><i class="ri-delete-bin-line"></i></button>
                </div>
            `).join('') || '<div style="color:var(--text-dim); font-size:0.8rem;">Sin objetivos asignados</div>';

            // Filtrar y renderizar Mensajes del empleado
            const myMsgs = db.mensajes.filter(m => m.empId === empId);
            document.getElementById('modalMsgList').innerHTML = myMsgs.map(m => `
                <div class="mini-item" style="border-left: 3px solid var(--success);">
                    <span style="font-size:0.85rem;">${m.texto}</span>
                    <button style="background:none;border:none;color:var(--error);cursor:pointer;" onclick="delMsg('${m.id}')"><i class="ri-delete-bin-line"></i></button>
                </div>
            `).join('') || '<div style="color:var(--text-dim); font-size:0.8rem;">No hay mensajes</div>';
        };

        document.getElementById('formAddObj').addEventListener('submit', (e) => {
            e.preventDefault();
            if(!activeEmpId) return;
            const db = getDB();
            db.objetivos.push({ id: 'O'+Date.now(), empId: activeEmpId, texto: document.getElementById('d_objTexto').value, estado: 'pendiente' });
            saveDB('vp_objetivos', db.objetivos);
            e.target.reset();
        });

        document.getElementById('formAddMsg').addEventListener('submit', (e) => {
            e.preventDefault();
            if(!activeEmpId) return;
            const db = getDB();
            db.mensajes.push({ id: 'M'+Date.now(), empId: activeEmpId, texto: document.getElementById('d_msgTexto').value });
            saveDB('vp_mensajes', db.mensajes);
            e.target.reset();
        });

        window.delObj = (id) => { let db = getDB(); saveDB('vp_objetivos', db.objetivos.filter(o => o.id !== id)); };
        window.delMsg = (id) => { let db = getDB(); saveDB('vp_mensajes', db.mensajes.filter(m => m.id !== id)); };

        // Forzar actualización al detectar cambios de la otra pestaña
        window.addEventListener('storage', renderDueno);
        
        // Sincronización infinita (Polling) para asegurar tiempo real
        setInterval(renderDueno, 1500);
        
        renderDueno();
    }

    // ==========================================
    // PANEL EMPLEADO
    // ==========================================
    if (ROLE === 'empleado') {
        const renderEmpleado = () => {
            const db = getDB();
            const scrIni = document.getElementById('screen-iniciar');
            const scrAct = document.getElementById('screen-activo');

            if (db.turno && db.turno.empId) {
                scrIni.style.display = 'none';
                scrAct.style.display = 'block';
                document.getElementById('e_nombreActivo').innerText = db.turno.nombre;

                // 1. Render Objetivos
                const myObjs = db.objetivos.filter(o => o.empId === db.turno.empId);
                document.getElementById('e_objetivos').innerHTML = myObjs.length > 0 ? myObjs.map(o => `
                    <div class="obj-card ${o.estado === 'cumplido' ? 'cumplido' : ''}">
                        <div class="obj-text">${o.texto}</div>
                        ${o.estado !== 'cumplido' ? `<button onclick="cumplirObj('${o.id}')" style="background:var(--success);color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;font-weight:bold;">Completar</button>` : '✅'}
                    </div>
                `).join('') : '<div style="color:var(--text-dim);font-size:0.9rem;">No tienes objetivos pendientes.</div>';

                // 2. Render Mensajes
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
                // Guardar valor actual para no perder foco
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

        // Registrar Venta
        document.getElementById('formVenta').addEventListener('submit', (e) => {
            e.preventDefault();
            const db = getDB();
            db.ventas.unshift({
                hora: new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'}),
                desc: document.getElementById('v_desc').value,
                monto: document.getElementById('v_monto').value
            });
            saveDB('vp_ventas', db.ventas);
            e.target.reset();
            alert("✅ Venta registrada");
        });

        window.cumplirObj = (id) => {
            const db = getDB();
            const obj = db.objetivos.find(o => o.id === id);
            if(obj) { obj.estado = 'cumplido'; saveDB('vp_objetivos', db.objetivos); }
        };

        window.cerrarTurno = () => {
            if(confirm("¿Estás seguro de cerrar el turno?")) {
                localStorage.removeItem('vp_turno');
                window.dispatchEvent(new Event('storage'));
                renderEmpleado();
            }
        };

        window.addEventListener('storage', renderEmpleado);
        
        // Sincronización infinita (Polling)
        setInterval(renderEmpleado, 1500);
        
        renderEmpleado();
    }
})();