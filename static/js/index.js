document.addEventListener('DOMContentLoaded', function() {
    const valueBtn = document.getElementById('value-btn');
    const fileBtn = document.getElementById('file-btn');
    const valueSection = document.getElementById('value-section');
    const fileSection = document.getElementById('file-section');
    const valueForm = document.getElementById('value-form');
    const fileForm = document.getElementById('file-form');
    const valueResult = document.getElementById('value-result');
    const fileResult = document.getElementById('file-result');
    const correlationPlot = document.getElementById('correlation-plot');
    const predictionPlot = document.getElementById('prediction-plot');

    // Функция для переключения вкладок
    function switchTab(activeTab) {
        // Скрываем все секции
        valueSection.style.display = 'none';
        fileSection.style.display = 'none';
        
        // Убираем активный класс со всех кнопок
        valueBtn.classList.remove('active');
        fileBtn.classList.remove('active');
        
        // Показываем нужную секцию и делаем кнопку активной
        if (activeTab === 'value') {
            valueSection.style.display = 'block';
            valueBtn.classList.add('active');
        } else {
            fileSection.style.display = 'block';
            fileBtn.classList.add('active');
        }
    }

    // Обработчики клика на кнопки
    valueBtn.addEventListener('click', () => switchTab('value'));
    fileBtn.addEventListener('click', () => switchTab('file'));
    
    // Инициализация - показываем вкладку "Значение" по умолчанию
    switchTab('value');

    // Обработка формы ввода значений
    valueForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const tv = parseFloat(document.getElementById('tv').value);
        const radio = parseFloat(document.getElementById('radio').value);
        const newspaper = parseFloat(document.getElementById('newspaper').value);

        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    Телевиденье: tv,
                    Радио: radio,
                    Газета: newspaper
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка сервера');
            }

            const data = await response.json();
            valueResult.innerHTML = `
                <h3>Результат прогноза:</h3>
                <p>Прогнозируемый объем продаж: <strong>${data.prediction.toFixed(2)}$</strong></p>
                <p>В рублях (курс ${data.exchange_rate}): <strong>${data.prediction_rub.toFixed(2)}P</strong></p>
            `;
        } catch (error) {
            valueResult.innerHTML = `
                <div class="error">Ошибка: ${error.message}</div>
            `;
        }
    });

    // Обработка формы загрузки файла
    fileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fileInput = document.getElementById('file-input');
        if (!fileInput.files.length) return;

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка сервера');
            }

            const data = await response.json();

            fileResult.innerHTML = `
                <div class="plots-container">
                    <img id="correlation-plot" class="plot-image" src="${data.correlation_plot}">
                    <img id="prediction-plot" class="plot-image" src="${data.prediction_plot}">
                </div>
                <div id="predictions-table-container"></div>
                <button class="download-btn">Скачать результаты CSV</button>
            `;

            displayPredictionsTable(data);

            document.querySelector('.download-btn').addEventListener('click', () => {
                downloadResults(data.result_file);
            });

            fileResult.style.display = 'block';
        } catch (error) {
            fileResult.innerHTML = `
                <div class="error">Ошибка: ${error.message}</div>
            `;
        }
    });
    // Функция для скачивания файла с результатами
    function downloadResults(filename) {
        window.location.href = `/download/${filename}`;
    }
    function displayPredictionsTable(data) {
        const container = document.getElementById('predictions-table-container');
    
        // Создаем HTML для таблицы
        let tableHTML = `
            <h3>Результаты прогнозирования</h3>
            <div class="table-responsive">
                <table class="predictions-table">
                    <thead>
                        <tr>
                            <th>№</th>
                            <th>Фактические продажи ($)</th>
                            <th>Прогноз продаж ($)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Добавляем строки с данными и прогнозами
        for (let i = 0; i < data.actual.length; i++) {
            tableHTML += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${data.actual[i].toFixed(2)}</td>
                    <td>${data.predictions[i].toFixed(2)}</td>
                </tr>
            `;
        }
        
        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        // Добавляем таблицу в контейнер результатов
        container.innerHTML = tableHTML;
    }

    // Активируем вкладку по умолчанию
    valueBtn.click();
});