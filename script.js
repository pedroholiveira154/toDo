        // Estrutura de dados
        let tarefas = {
            aFazer: [],
            fazendo: [],
            concluido: []
        };

        let tarefaArrastada = null;

        // Carregar tarefas do LocalStorage ao iniciar
        function carregarTarefas() {
            const tarefasSalvas = localStorage.getItem('kanbanTarefas');
            if (tarefasSalvas) {
                tarefas = JSON.parse(tarefasSalvas);
            }
            renderizarTarefas();
        }

        // Salvar tarefas no LocalStorage
        function salvarTarefas() {
            localStorage.setItem('kanbanTarefas', JSON.stringify(tarefas));
            atualizarContadores();
        }

        // Verificar se a tarefa já existe (case insensitive)
        function verificarTarefaDuplicada(texto) {
            const textoNormalizado = texto.trim().toLowerCase();
            
            // Verificar em todas as colunas
            const todasTarefas = [
                ...tarefas.aFazer,
                ...tarefas.fazendo,
                ...tarefas.concluido
            ];
            
            return todasTarefas.some(tarefa => 
                tarefa.texto.trim().toLowerCase() === textoNormalizado
            );
        }

        // Adicionar nova tarefa com validação de duplicata
        function adicionarTarefa() {
            const inputElement = document.getElementById('inputTarefa');
            const texto = inputElement.value.trim();
            
            if (texto === '') {
                alert('Por favor, digite uma tarefa válida!');
                return;
            }
            
            // Verificar se a tarefa já existe
            if (verificarTarefaDuplicada(texto)) {
                const continuar = confirm(`⚠️ A tarefa "${texto}" já existe!\n\nDeseja continuar mesmo assim?`);
                
                if (!continuar) {
                    // Se o usuário cancelar, limpa o input e foca
                    inputElement.value = '';
                    inputElement.focus();
                    return;
                }
            }
            
            // Criar nova tarefa
            const novaTarefa = {
                id: Date.now(),
                texto: texto,
                dataCriacao: new Date().toLocaleString()
            };
            
            tarefas.aFazer.push(novaTarefa);
            salvarTarefas();
            renderizarTarefas();
            
            // Limpar input e focar
            inputElement.value = '';
            inputElement.focus();
        }

        // Remover tarefa específica
        function removerTarefa(status, id) {
            if (confirm('Tem certeza que deseja remover esta tarefa?')) {
                tarefas[status] = tarefas[status].filter(tarefa => tarefa.id !== id);
                salvarTarefas();
                renderizarTarefas();
            }
        }

        // Limpar todas as tarefas
        function limparTodasTarefas() {
            if (confirm('⚠️ ATENÇÃO: Isso irá apagar TODAS as tarefas! Tem certeza?')) {
                tarefas = {
                    aFazer: [],
                    fazendo: [],
                    concluido: []
                };
                salvarTarefas();
                renderizarTarefas();
            }
        }

        // Atualizar contadores de cada coluna
        function atualizarContadores() {
            document.getElementById('contadorAFazer').textContent = tarefas.aFazer.length;
            document.getElementById('contadorFazendo').textContent = tarefas.fazendo.length;
            document.getElementById('contadorConcluido').textContent = tarefas.concluido.length;
        }

        // Renderizar todas as tarefas na interface
        function renderizarTarefas() {
            renderizarColuna('aFazer', 'listaAFazer');
            renderizarColuna('fazendo', 'listaFazendo');
            renderizarColuna('concluido', 'listaConcluido');
            atualizarContadores();
        }

        // Renderizar uma coluna específica
        function renderizarColuna(status, elementId) {
            const container = document.getElementById(elementId);
            const tarefasDaColuna = tarefas[status];
            
            if (tarefasDaColuna.length === 0) {
                container.innerHTML = '<div class="mensagem-vazia">✨ Nenhuma tarefa aqui</div>';
                return;
            }
            
            container.innerHTML = tarefasDaColuna.map(tarefa => `
                <div class="tarefa" draggable="true" data-id="${tarefa.id}" data-status="${status}">
                    <div class="tarefa-texto">
                        <strong>${escapeHtml(tarefa.texto)}</strong>
                        <div style="font-size: 12px; color: #999; margin-top: 5px;">
                            📅 ${tarefa.dataCriacao}
                        </div>
                    </div>
                    <button class="btn-remover" onclick="removerTarefa('${status}', ${tarefa.id})">
                        ✖ Remover
                    </button>
                </div>
            `).join('');
            
            // Adicionar event listeners para drag and drop
            const tarefasElementos = container.querySelectorAll('.tarefa');
            tarefasElementos.forEach(tarefaElemento => {
                tarefaElemento.addEventListener('dragstart', dragStart);
                tarefaElemento.addEventListener('dragend', dragEnd);
            });
        }

        // Função para escapar HTML e prevenir XSS
        function escapeHtml(texto) {
            const div = document.createElement('div');
            div.textContent = texto;
            return div.innerHTML;
        }

        // Drag and Drop functions
        function dragStart(event) {
            const tarefaElemento = event.target.closest('.tarefa');
            if (!tarefaElemento) return;
            
            tarefaArrastada = {
                id: parseInt(tarefaElemento.dataset.id),
                statusOrigem: tarefaElemento.dataset.status
            };
            
            event.dataTransfer.setData('text/plain', '');
            event.dataTransfer.effectAllowed = 'move';
            tarefaElemento.classList.add('dragging');
        }

        function dragEnd(event) {
            const tarefaElemento = event.target.closest('.tarefa');
            if (tarefaElemento) {
                tarefaElemento.classList.remove('dragging');
            }
            tarefaArrastada = null;
            
            // Remover classe de drag-over de todas as listas
            document.querySelectorAll('.lista-tarefas').forEach(lista => {
                lista.classList.remove('drag-over');
            });
        }

        function dragOver(event) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            
            const listaDestino = event.target.closest('.lista-tarefas');
            if (listaDestino && !listaDestino.classList.contains('drag-over')) {
                document.querySelectorAll('.lista-tarefas').forEach(lista => {
                    lista.classList.remove('drag-over');
                });
                listaDestino.classList.add('drag-over');
            }
        }

        function drop(event) {
            event.preventDefault();
            
            const listaDestino = event.target.closest('.lista-tarefas');
            if (!listaDestino || !tarefaArrastada) return;
            
            const statusDestino = listaDestino.dataset.status;
            const statusOrigem = tarefaArrastada.statusOrigem;
            const idTarefa = tarefaArrastada.id;
            
            // Se for a mesma coluna, não fazer nada
            if (statusOrigem === statusDestino) {
                limparDragOver();
                return;
            }
            
            // Encontrar a tarefa na origem
            const tarefaEncontrada = tarefas[statusOrigem].find(t => t.id === idTarefa);
            
            if (tarefaEncontrada) {
                // Remover da origem
                tarefas[statusOrigem] = tarefas[statusOrigem].filter(t => t.id !== idTarefa);
                // Adicionar ao destino
                tarefas[statusDestino].push(tarefaEncontrada);
                // Salvar e renderizar
                salvarTarefas();
                renderizarTarefas();
            }
            
            limparDragOver();
        }
        
        function limparDragOver() {
            document.querySelectorAll('.lista-tarefas').forEach(lista => {
                lista.classList.remove('drag-over');
            });
        }

        // Configurar event listeners para drag and drop nas listas
        function configurarDragAndDrop() {
            const listas = document.querySelectorAll('.lista-tarefas');
            listas.forEach(lista => {
                lista.addEventListener('dragover', dragOver);
                lista.addEventListener('drop', drop);
            });
        }

        // Permitir adicionar tarefa com Enter
        document.addEventListener('DOMContentLoaded', () => {
            carregarTarefas();
            configurarDragAndDrop();
            
            const inputTarefa = document.getElementById('inputTarefa');
            inputTarefa.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    adicionarTarefa();
                }
            });
        });