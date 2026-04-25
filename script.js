document.addEventListener('DOMContentLoaded', () => {
    // --- DATABASE LOCAL ---
    const getDB = () => ({
        empleados: JSON.parse(localStorage.getItem('vp_empleados')) || [],
        turno: JSON.parse(localStorage.getItem('vp_turno')) || null,
        ventas: JSON.parse(localStorage.getItem('vp_ventas')) || [],
        objetivos: JSON.parse(localStorage.getItem('vp_objetivos')) || []
    });

    const saveDB = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
        // Disparar evento custom para simular tiempo real si estamos en la misma pestaña
        window.dispatchEvent(new Event('storage'));
    };

    const ROLE = document.body.getAttribute('data-role');

    // ==========================================
    // PANEL DUEÑO
    // ==========================================
    if (ROLE === 'dueno') {
        const renderDueno = () => {
            const db = getDB();
            
            // Render Empleados
            const le = document.getElementById('listaEmpleados');
            le.innerHTML = db.empleados.map(e => `<div class="mini-item"><span><i class="ri-user-line"></i> ${e.nombre}</span> <button style="background:none;border:none;color:var(--error);" onclick="delEmp('${e.id}')"><i class="ri-delete-bin-line"></i></button></div>`).join('');

            // Render Turno
            const tLive = document.getElementById('turnoLive');
            if(db.turno) {
                tLive.innerHTML = `
                    <div style="color:var(--success); font-weight:bold;"><i class="ri-record-circle-line"></i> Turno Activo</div>
                    <div><strong>Empleado:</strong> ${db.turno.nombre}</div>
                    <div><strong>Ingreso:</strong> ${db.turno.hora}</div>
                    <div><strong>Caja Inicial:</strong> $${db.turno.caja}</div>
                `;
            } else {
                tLive.innerHTML = '<div style="color:var(--text-dim);">No hay turnos activos actualmente.</div>';
            }

            // Render Ventas
            const vTable = document.getElementById('ventasTable');
            let total = 0;
            vTable.innerHTML = '';
            db.ventas.forEach(v => {
                total += parseFloat(v.monto);
                vTable.innerHTML += `<tr><td>${v.hora}</td><td>${v.desc}</td><td style="color:var(--success); font-weight:bold;">$${v.monto}</td></tr>`;
            });
            document.getElementById('totalVentas').innerText = total.toFixed(2);

            // Render Objetivos
            const oList = document.getElementById('objetivosLive');
            oList.innerHTML = db.objetivos.map(o => `
                <div class="obj-card ${o.estado === 'cumplido' ? 'cumplido' : ''}">
                    <div class="obj-text">${o.texto}</div>
                    <div>${o.estado === 'cumplido' ? '<i class="ri-checkbox-circle-fill" style="color:var(--success);font-size:1.2rem;"></i>' : '<i class="ri-time-line" style="color:var(--text-dim);font-size:1.2rem;"></i>'}</div>
                </div>
            `).join('');
        };

        // Add Empleado
        document.getElementById('formAddEmpleado').addEventListener('submit', (e) => {
            e.preventDefault();
            const db = getDB();
            db.empleados.push({ id: 'E'+Date.now(), nombre: document.getElementById('d_nombreEmp').value });
            saveDB('vp_empleados', db.empleados);
            e.target.reset();
        });

        // Add Objetivo
        document.getElementById('formAddObj').addEventListener('submit', (e) => {
            e.preventDefault();
            const db = getDB();
            db.objetivos.push({ id: 'O'+Date.now(), texto: document.getElementById('d_objTexto').value, estado: 'pendiente' });
            saveDB('vp_objetivos', db.objetivos);
            e.target.reset();
        });

        window.delEmp = (id) => {
            let db = getDB();
            db.empleados = db.empleados.filter(e => e.id !== id);
            saveDB('vp_empleados', db.empleados);
        };

        window.addEventListener('storage', renderDueno);
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

            if (db.turno) {
                scrIni.style.display = 'none';
                scrAct.style.display = 'block';
                document.getElementById('e_nombreActivo').innerText = db.turno.nombre;

                // Render Objetivos
                document.getElementById('e_objetivos').innerHTML = db.objetivos.map(o => `
                    <div class="obj-card ${o.estado === 'cumplido' ? 'cumplido' : ''}">
                        <div class="obj-text">${o.texto}</div>
                        ${o.estado !== 'cumplido' ? `<button onclick="cumplirObj('${o.id}')" style="background:var(--success);color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Cumplir</button>` : '✅'}
                    </div>
                `).join('');
            } else {
                scrIni.style.display = 'block';
                scrAct.style.display = 'none';
                
                const selectEmp = document.getElementById('e_empId');
                selectEmp.innerHTML = '<option value="">-- Selecciona --</option>' + db.empleados.map(e => `<option value="${e.nombre}">${e.nombre}</option>`).join('');
            }
        };

        // Iniciar Turno
        document.getElementById('formTurno').addEventListener('submit', (e) => {
            e.preventDefault();
            const hora = new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
            const turno = {
                nombre: document.getElementById('e_empId').value,
                caja: document.getElementById('e_cajaIni').value,
                hora: hora
            };
            saveDB('vp_turno', turno);
            renderEmpleado();
        });

        // Registrar Venta
        document.getElementById('formVenta').addEventListener('submit', (e) => {
            e.preventDefault();
            const db = getDB();
            const hora = new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
            db.ventas.unshift({
                hora: hora,
                desc: document.getElementById('v_desc').value,
                monto: document.getElementById('v_monto').value
            });
            saveDB('vp_ventas', db.ventas);
            e.target.reset();
            alert("✅ Venta registrada en vivo");
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
        renderEmpleado();
    }
});
