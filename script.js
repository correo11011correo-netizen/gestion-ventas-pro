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

        let carrito = [];
        let metodoPago = 'Efectivo';

        window.selectPayMethod = (method) => {
            metodoPago = method;
            document.getElementById('btn_pay_efectivo').classList.toggle('active', method === 'Efectivo');
            document.getElementById('btn_pay_transf').classList.toggle('active', method === 'Transferencia');
        };

        const renderCarrito = () => {
            const list = document.getElementById('v_carrito_lista');
            const totalEl = document.getElementById('v_carrito_total');
            const btnCheckout = document.getElementById('btn_checkout');

            if (!list) return;

            if (carrito.length === 0) {
                list.innerHTML = '<div class="empty-cart">El carrito está vacío</div>';
                totalEl.innerText = '$0.00';
                btnCheckout.disabled = true;
                return;
            }

            let total = 0;
            list.innerHTML = carrito.map((item, index) => {
                total += item.precio * item.cantidad;
                return `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <div class="cart-item-name">${item.nombre}</div>
                            <div class="cart-item-price">$${item.precio} x ${item.cantidad}</div>
                        </div>
                        <div class="cart-item-actions">
                            <button class="btn-qty" onclick="modificarCarrito(${index}, -1)">-</button>
                            <span style="font-weight:bold; font-size:0.9rem;">${item.cantidad}</span>
                            <button class="btn-qty" onclick="modificarCarrito(${index}, 1)">+</button>
                        </div>
                    </div>
                `;
            }).join('');

            totalEl.innerText = '$' + total.toFixed(2);
            btnCheckout.disabled = false;
        };

        window.modificarCarrito = (index, delta) => {
            const db = getDB();
            const item = carrito[index];
            const prod = db.productos.find(p => p.id === item.id);
            
            if (delta > 0 && item.cantidad >= prod.stock) {
                return alert("¡No hay más stock disponible!");
            }
            
            item.cantidad += delta;
            if (item.cantidad <= 0) {
                carrito.splice(index, 1);
            }
            renderCarrito();
            renderEmpleado();
        };

        window.agregarAlCarrito = (pId) => {
            const db = getDB();
            const prod = db.productos.find(x => x.id === pId);
            
            const itemExistente = carrito.find(x => x.id === pId);
            const cantEnCarrito = itemExistente ? itemExistente.cantidad : 0;

            if (prod.stock <= cantEnCarrito) {
                return alert("¡No hay stock suficiente!");
            }

            if (itemExistente) {
                itemExistente.cantidad += 1;
            } else {
                carrito.push({
                    id: prod.id,
                    nombre: prod.nombre,
                    precio: parseFloat(prod.precio),
                    cantidad: 1
                });
            }
            renderCarrito();
            renderEmpleado();
        };

        window.procesarVentaCarrito = () => {
            if (carrito.length === 0) return;
            
            let db = getDB();
            let totalVenta = 0;
            
            for (const item of carrito) {
                const prod = db.productos.find(p => p.id === item.id);
                if (!prod || prod.stock < item.cantidad) {
                    return alert(`No hay stock suficiente para ${item.nombre}.`);
                }
            }

            const idVentaBase = 'V' + Date.now();
            let count = 0;

            for (const item of carrito) {
                const pIdx = db.productos.findIndex(p => p.id === item.id);
                db.productos[pIdx].stock -= item.cantidad;
                
                const totalItem = (item.precio * item.cantidad).toFixed(2);
                totalVenta += parseFloat(totalItem);

                db.ventas.unshift({ 
                    id: idVentaBase + '-' + count++, 
                    fecha: new Date().toLocaleDateString('es-ES'), 
                    hora: new Date().toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}), 
                    vendedor: db.turno.nombre, 
                    productoNombre: item.nombre, 
                    cantidad: item.cantidad, 
                    total: totalItem,
                    metodoPago: metodoPago
                });
            }

            saveDB('vp_productos', db.productos);
            saveDB('vp_ventas', db.ventas);
            
            alert(`¡Venta procesada con éxito!\nTotal: $${totalVenta.toFixed(2)}\nMétodo: ${metodoPago}`);
            carrito = [];
            renderCarrito();
            renderEmpleado();
        };

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
                    const newGridHTML = db.productos.map(p => {
                        const enCarrito = carrito.find(c => c.id === p.id);
                        const cantEnCarrito = enCarrito ? enCarrito.cantidad : 0;
                        const stockRestante = p.stock - cantEnCarrito;
                        const disabled = stockRestante <= 0;
                        return `
                        <button class="prod-btn" ${disabled ? 'disabled' : ''} onclick="agregarAlCarrito('${p.id}')">
                            <span class="p-name">${p.nombre}</span>
                            <span class="p-price">$${p.precio}</span>
                            <span class="p-stock">Disp: ${stockRestante}</span>
                        </button>
                        `;
                    }).join('');
                    
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

        window.cumplirObj = (id) => { const db = getDB(); const o = db.objetivos.find(x => x.id === id); if(o){ o.estado = 'cumplido'; saveDB('vp_objetivos', db.objetivos); } };
        window.cerrarTurno = () => { if(confirm("Cerrar?")){ localStorage.removeItem('vp_turno'); window.dispatchEvent(new Event('storage')); carrito = []; renderCarrito(); renderEmpleado(); } };

        window.addEventListener('storage', renderEmpleado);
        setInterval(renderEmpleado, 1500);
        renderEmpleado();
        renderCarrito();
    }
})();