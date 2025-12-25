import os
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import json
from functools import wraps
import glob
import uuid
from werkzeug.utils import secure_filename
import shutil

app = Flask(__name__)
app.secret_key = 'dolina_waterfalls_secret_key_2025'

# Конфигурация администратора
ADMIN_CREDENTIALS = {
    'username': 'admin',
    'password': 'admin'
}

# Конфигурация загрузки файлов
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

def allowed_file(filename):
    """Проверка разрешенных расширений файлов"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Декоратор для защиты маршрутов, требующих авторизации
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Путь к файлу с данными страницы
DATA_FILE = os.path.join(BASE_DIR, 'page_data.json')
ATTRACTIONS_FILE = os.path.join(BASE_DIR, 'attractions_data.json')

def load_page_data():
    """Загрузка данных страницы из файла"""
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Ошибка при загрузке данных: {e}")
        return {}

def save_page_data(data):
    """Сохранение данных страницы в файл"""
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Ошибка при сохранении данных: {e}")
        return False

def load_attractions():
    """Загрузка данных достопримечательностей"""
    try:
        with open(ATTRACTIONS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Ошибка при загрузке достопримечательностей: {e}")
        return []

def save_attractions(attractions):
    """Сохранение данных достопримечательностей"""
    try:
        print(f"Сохранение {len(attractions)} достопримечательностей в {ATTRACTIONS_FILE}")
        with open(ATTRACTIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(attractions, f, ensure_ascii=False, indent=2)
        
        # Проверяем, что файл был сохранен
        if os.path.exists(ATTRACTIONS_FILE):
            file_size = os.path.getsize(ATTRACTIONS_FILE)
            print(f"Файл успешно сохранен. Размер: {file_size} байт")
        else:
            print("ОШИБКА: Файл не был создан!")
            
        return True
    except Exception as e:
        print(f"Ошибка при сохранении достопримечательностей: {e}")
        return False

def load_attractions():
    """Загрузка данных достопримечательностей"""
    try:
        print(f"Загрузка достопримечательностей из {ATTRACTIONS_FILE}")
        if not os.path.exists(ATTRACTIONS_FILE):
            print(f"Файл {ATTRACTIONS_FILE} не существует. Создаем пустой список.")
            return []
            
        with open(ATTRACTIONS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"Загружено {len(data)} достопримечательностей")
            return data
    except Exception as e:
        print(f"Ошибка при загрузке достопримечательностей: {e}")
        return []

def get_attraction_images(folder):
    """Получение списка изображений для достопримечательности"""
    images_dir = os.path.join(app.static_folder, 'images', 'attraction-block', folder)
    images = []
    
    if os.path.exists(images_dir):
        extensions = ('*.jpg', '*.jpeg', '*.png', '*.webp', '*.gif')
        for ext in extensions:
            images.extend(glob.glob(os.path.join(images_dir, ext)))
        
        # Сортируем по имени и берем только имена файлов
        images.sort()
        images = [os.path.basename(img) for img in images]
    
    return images

def get_hero_images():
    """Получить список изображений для героя"""
    images_dir = os.path.join(app.static_folder, 'images', 'hero-section')
    images = []
    
    if os.path.exists(images_dir):
        # Получаем все изображения с расширениями jpg, jpeg, png, webp, gif
        extensions = ('*.jpg', '*.jpeg', '*.png', '*.webp', '*.gif')
        for ext in extensions:
            images.extend(glob.glob(os.path.join(images_dir, ext)))
        
        # Сортируем по имени
        images.sort()
        
        # Преобразуем полные пути в относительные для использования в шаблоне
        images = [os.path.relpath(img, app.static_folder).replace('\\', '/') for img in images]
    
    return images

def get_image_info():
    """Получить информацию об изображениях (размер, дата создания)"""
    images_dir = os.path.join(app.static_folder, 'images', 'hero-section')
    images_info = []
    
    if os.path.exists(images_dir):
        extensions = ('*.jpg', '*.jpeg', '*.png', '*.webp', '*.gif')
        for ext in extensions:
            for img_path in glob.glob(os.path.join(images_dir, ext)):
                try:
                    stat = os.stat(img_path)
                    images_info.append({
                        'filename': os.path.basename(img_path),
                        'path': os.path.relpath(img_path, app.static_folder).replace('\\', '/'),
                        'size': stat.st_size,
                        'created': stat.st_ctime,
                        'modified': stat.st_mtime
                    })
                except:
                    continue
        
        # Сортируем по имени
        images_info.sort(key=lambda x: x['filename'])
    
    return images_info

# Добавим в конфигурацию
GALLERY_FOLDER = 'gallery-section'

# Добавим функции для работы с галереей
def get_gallery_images():
    """Получить список изображений галереи"""
    images_dir = os.path.join(app.static_folder, 'images', GALLERY_FOLDER)
    images = []
    
    if os.path.exists(images_dir):
        extensions = ('*.jpg', '*.jpeg', '*.png', '*.webp', '*.gif')
        for ext in extensions:
            for img_path in glob.glob(os.path.join(images_dir, ext)):
                try:
                    stat = os.stat(img_path)
                    images.append({
                        'filename': os.path.basename(img_path),
                        'path': os.path.relpath(img_path, app.static_folder).replace('\\', '/'),
                        'size': stat.st_size,
                        'created': stat.st_ctime,
                        'modified': stat.st_mtime
                    })
                except Exception as e:
                    print(f"Ошибка при получении информации о файле {img_path}: {e}")
                    # Добавляем изображение с минимальной информацией
                    images.append({
                        'filename': os.path.basename(img_path),
                        'path': os.path.relpath(img_path, app.static_folder).replace('\\', '/'),
                        'size': 0,
                        'created': 0,
                        'modified': 0
                    })
        
        # Сортируем по имени
        images.sort(key=lambda x: x['filename'])
    
    return images

@app.route('/')
def index():
    """Главная страница"""
    page_data = load_page_data()
    hero_images = get_hero_images()
    attractions = load_attractions()
    # Сортируем достопримечательности по order
    attractions.sort(key=lambda x: x.get('order', 0))
    return render_template('index.html', page_data=page_data, hero_images=hero_images, attractions=attractions)

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Страница входа"""
    if 'logged_in' in session:
        return redirect(url_for('admin_panel'))
    
    error = None
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if (username == ADMIN_CREDENTIALS['username'] and 
            password == ADMIN_CREDENTIALS['password']):
            session['logged_in'] = True
            return redirect(url_for('admin_panel'))
        else:
            error = 'Неверные учетные данные'
    
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    """Выход из системы"""
    session.pop('logged_in', None)
    return redirect(url_for('index'))

@app.route('/admin')
@login_required
def admin_panel():
    """Перенаправление на домашнюю страницу админ-панели"""
    return redirect(url_for('admin_home'))

@app.route('/admin/home')
@login_required
def admin_home():
    """Административная панель - домашняя страница"""
    page_data = load_page_data()
    images_info = get_image_info()
    return render_template('admin_home.html', page_data=page_data, 
                          images_info=images_info, active_tab='home')

@app.route('/admin/update', methods=['POST'])
@login_required
def update_content():
    """Обновление контента через AJAX"""
    try:
        page_data = load_page_data()
        data = request.get_json()
        
        print(f"Полученные данные для обновления: {data}")
        
        section = data.get('section')
        fields = data.get('fields')
        
        if not section:
            return jsonify({'success': False, 'message': 'Не указан раздел (section)'})
        
        if not fields:
            return jsonify({'success': False, 'message': 'Не указаны поля для обновления (fields)'})
        
        # Игнорируем запросы к удаленному разделу stats
        if section == 'stats':
            return jsonify({'success': False, 'message': 'Раздел статистики удален'})
        
        if section not in page_data:
            page_data[section] = {}
        
        for field, value in fields.items():
            page_data[section][field] = value
        
        if save_page_data(page_data):
            return jsonify({'success': True, 'message': 'Данные успешно обновлены'})
        else:
            return jsonify({'success': False, 'message': 'Ошибка при сохранении файла'})
            
    except Exception as e:
        print(f"Ошибка в update_content: {e}")
        return jsonify({'success': False, 'message': f'Внутренняя ошибка сервера: {str(e)}'})

@app.route('/admin/upload-image', methods=['POST'])
@login_required
def upload_image():
    """Загрузка изображения"""
    try:
        print("=== DEBUG: Начало загрузки изображения для слайдера ===")
        print(f"Запрос файлов: {request.files}")
        
        # Проверяем, есть ли файл в запросе
        if 'image' not in request.files:
            print("DEBUG: Ключ 'image' не найден в request.files")
            return jsonify({'success': False, 'message': 'Файл не найден в запросе'})
        
        file = request.files['image']
        print(f"DEBUG: Получен файл: {file.filename}")
        
        # Если пользователь не выбрал файл
        if file.filename == '':
            print("DEBUG: Имя файла пустое")
            return jsonify({'success': False, 'message': 'Файл не выбран'})
        
        # Проверяем размер файла
        file.seek(0, 2)  # Переходим в конец файла
        file_size = file.tell()
        file.seek(0)  # Возвращаемся в начало
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({'success': False, 'message': f'Файл слишком большой. Максимальный размер: {MAX_FILE_SIZE // (1024*1024)}MB'})
        
        # Проверяем расширение файла
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'message': 'Неподдерживаемый формат файла. Разрешенные форматы: PNG, JPG, JPEG, GIF, WEBP'})
        
        # Создаем безопасное имя файла
        original_filename = secure_filename(file.filename)
        name, ext = os.path.splitext(original_filename)
        
        # Генерируем уникальное имя файла, чтобы избежать конфликтов
        unique_filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
        
        # Создаем папку, если ее нет
        upload_folder = os.path.join(app.static_folder, 'images', 'hero-section')
        os.makedirs(upload_folder, exist_ok=True)
        
        # Сохраняем файл
        file_path = os.path.join(upload_folder, unique_filename)
        file.save(file_path)
        
        print(f"Файл сохранен: {file_path}")
        
        return jsonify({
            'success': True, 
            'message': 'Изображение успешно загружено',
            'filename': unique_filename,
            'path': f"images/hero-section/{unique_filename}"
        })
        
    except Exception as e:
        print(f"Ошибка при загрузке изображения: {e}")
        return jsonify({'success': False, 'message': f'Ошибка при загрузке: {str(e)}'})

@app.route('/admin/delete-image', methods=['POST'])
@login_required
def delete_image():
    """Удаление изображения"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        
        if not filename:
            return jsonify({'success': False, 'message': 'Не указано имя файла'})
        
        # Проверяем, что файл находится в разрешенной директории
        safe_filename = secure_filename(filename)
        
        # Полный путь к файлу
        file_path = os.path.join(app.static_folder, 'images', 'hero-section', safe_filename)
        
        # Проверяем, что файл существует и находится в правильной директории
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'message': 'Файл не найден'})
        
        # Удаляем файл
        os.remove(file_path)
        print(f"Файл удален: {file_path}")
        
        return jsonify({'success': True, 'message': 'Изображение успешно удалено'})
        
    except Exception as e:
        print(f"Ошибка при удалении изображения: {e}")
        return jsonify({'success': False, 'message': f'Ошибка при удалении: {str(e)}'})

@app.route('/admin/reset-password', methods=['POST'])
@login_required
def reset_password():
    """Смена пароля администратора"""
    try:
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if current_password != ADMIN_CREDENTIALS['password']:
            return jsonify({'success': False, 'message': 'Текущий пароль неверен'})
        
        if new_password != confirm_password:
            return jsonify({'success': False, 'message': 'Новые пароли не совпадают'})
        
        if len(new_password) < 3:
            return jsonify({'success': False, 'message': 'Пароль должен быть не менее 3 символов'})
        
        ADMIN_CREDENTIALS['password'] = new_password
        
        return jsonify({'success': True, 'message': 'Пароль успешно изменен'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/admin/attractions', methods=['POST'])
@login_required
def create_attraction():
    """Создание новой достопримечательности"""
    try:
        data = request.get_json()
        
        # Проверяем обязательные поля
        if not data.get('title'):
            return jsonify({'success': False, 'message': 'Заголовок обязателен'})
        
        attractions = load_attractions()
        
        # Создаем новую достопримечательность
        new_id = get_next_attraction_id()
        
        # Создаем папку для изображений
        folder_name = f"block-{new_id}"
        
        new_attraction = {
            'id': new_id,
            'title': data.get('title', ''),
            'description': data.get('description', ''),
            'detailed_description': data.get('detailed_description', ''),
            'layout': data.get('layout', 'text_left'),
            'order': data.get('order', new_id),
            'folder': folder_name,
            'images': []  # Изначально нет изображений
        }
        
        attractions.append(new_attraction)
        
        # Создаем папку для изображений
        folder_path = os.path.join(app.static_folder, 'images', 'attraction-block', folder_name)
        os.makedirs(folder_path, exist_ok=True)
        
        if save_attractions(attractions):
            return jsonify({
                'success': True, 
                'message': 'Достопримечательность создана',
                'id': new_id
            })
        else:
            return jsonify({'success': False, 'message': 'Ошибка при сохранении'})
            
    except Exception as e:
        print(f"Ошибка при создании достопримечательности: {e}")
        return jsonify({'success': False, 'message': f'Ошибка: {str(e)}'})
        
@app.route('/admin/attractions', methods=['GET'])
@login_required
def admin_attractions():
    """Обработка достопримечательностей - возвращает JSON или HTML в зависимости от заголовков"""
    if request.headers.get('Accept') == 'application/json' or request.args.get('format') == 'json':
        # Если клиент хочет JSON
        try:
            attractions = load_attractions()
            attractions.sort(key=lambda x: x.get('order', 0))
            
            for attraction in attractions:
                folder = attraction.get('folder', '')
                if folder:
                    attraction['images_list'] = get_attraction_images(folder)
            
            return jsonify({'success': True, 'attractions': attractions})
        except Exception as e:
            print(f"Ошибка: {e}")
            return jsonify({'success': False, 'message': f'Ошибка сервера: {str(e)}'}), 500
    else:
        # Иначе возвращаем HTML страницу
        return render_template('admin_attractions.html', active_tab='attractions')


@app.route('/admin/attractions/<int:attraction_id>', methods=['PUT'])
@login_required
def update_attraction(attraction_id):
    """Обновление достопримечательности"""
    try:
        attractions = load_attractions()
        data = request.get_json()
        
        # Находим достопримечательность
        for i, attraction in enumerate(attractions):
            if attraction['id'] == attraction_id:
                # Обновляем поля
                for key in ['title', 'description', 'detailed_description', 'layout', 'order']:
                    if key in data:
                        attractions[i][key] = data[key]
                
                if save_attractions(attractions):
                    return jsonify({'success': True, 'message': 'Достопримечательность обновлена'})
                else:
                    return jsonify({'success': False, 'message': 'Ошибка при сохранении'})
        
        return jsonify({'success': False, 'message': 'Достопримечательность не найдена'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Ошибка: {str(e)}'})

@app.route('/admin/attractions/<int:attraction_id>', methods=['DELETE'])
@login_required
def delete_attraction(attraction_id):
    """Удаление достопримечательности"""
    try:
        attractions = load_attractions()
        
        # Находим достопримечательность
        for i, attraction in enumerate(attractions):
            if attraction['id'] == attraction_id:
                # Удаляем папку с изображениями
                folder_name = attraction.get('folder', '')
                if folder_name:
                    folder_path = os.path.join(app.static_folder, 'images', 'attraction-block', folder_name)
                    if os.path.exists(folder_path):
                        shutil.rmtree(folder_path)
                
                # Удаляем из списка
                del attractions[i]
                
                if save_attractions(attractions):
                    return jsonify({'success': True, 'message': 'Достопримечательность удалена'})
                else:
                    return jsonify({'success': False, 'message': 'Ошибка при сохранении'})
        
        return jsonify({'success': False, 'message': 'Достопримечательность не найдена'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Ошибка: {str(e)}'})

@app.route('/admin/attractions/order', methods=['POST'])
@login_required
def update_attractions_order():
    """Обновление порядка достопримечательностей"""
    try:
        data = request.get_json()
        new_order = data.get('order', [])
        
        if not new_order:
            return jsonify({'success': False, 'message': 'Не указан порядок'})
        
        attractions = load_attractions()
        
        # Обновляем порядок
        for attraction in attractions:
            if attraction['id'] in new_order:
                attraction['order'] = new_order.index(attraction['id']) + 1
        
        # Сортируем по новому порядку
        attractions.sort(key=lambda x: x['order'])
        
        if save_attractions(attractions):
            return jsonify({'success': True, 'message': 'Порядок обновлен'})
        else:
            return jsonify({'success': False, 'message': 'Ошибка при сохранении'})
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'Ошибка: {str(e)}'})

@app.route('/admin/attractions/<int:attraction_id>/images', methods=['POST'])
@login_required
def upload_attraction_image(attraction_id):
    """Загрузка изображения для достопримечательности"""
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'message': 'Файл не найден'})
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({'success': False, 'message': 'Файл не выбран'})
        
        # Проверка размера
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({'success': False, 'message': 'Файл слишком большой'})
        
        # Проверка расширения
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'message': 'Неподдерживаемый формат'})
        
        # Получаем информацию о достопримечательности
        attractions = load_attractions()
        folder_name = None
        attraction_index = -1
        
        for i, attraction in enumerate(attractions):
            if attraction['id'] == attraction_id:
                folder_name = attraction.get('folder', '')
                attraction_index = i
                break
        
        if not folder_name:
            return jsonify({'success': False, 'message': 'Достопримечательность не найдена'})
        
        # Создаем безопасное имя файла
        original_filename = secure_filename(file.filename)
        name, ext = os.path.splitext(original_filename)
        unique_filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
        
        # Сохраняем файл
        upload_folder = os.path.join(app.static_folder, 'images', 'attraction-block', folder_name)
        os.makedirs(upload_folder, exist_ok=True)
        
        file_path = os.path.join(upload_folder, unique_filename)
        file.save(file_path)
        
        # Обновляем список изображений в данных
        if attraction_index != -1:
            if 'images' not in attractions[attraction_index]:
                attractions[attraction_index]['images'] = []
            
            # Добавляем только если такого файла еще нет
            if unique_filename not in attractions[attraction_index]['images']:
                attractions[attraction_index]['images'].append(unique_filename)
                
                # Сохраняем изменения
                if save_attractions(attractions):
                    print(f"Добавлено изображение {unique_filename} для достопримечательности {attraction_id}")
                    print(f"Теперь изображения: {attractions[attraction_index]['images']}")
                else:
                    return jsonify({'success': False, 'message': 'Ошибка при сохранении данных'})
            else:
                print(f"Изображение {unique_filename} уже существует в списке")
        
        return jsonify({
            'success': True, 
            'message': 'Изображение загружено',
            'filename': unique_filename
        })
        
    except Exception as e:
        print(f"Ошибка при загрузке изображения: {e}")
        return jsonify({'success': False, 'message': f'Ошибка: {str(e)}'})

@app.route('/admin/attractions/<int:attraction_id>/images/<filename>', methods=['DELETE'])
@login_required
def delete_attraction_image(attraction_id, filename):
    """Удаление изображения достопримечательности"""
    try:
        attractions = load_attractions()
        folder_name = None
        
        # Находим папку достопримечательности
        for attraction in attractions:
            if attraction['id'] == attraction_id:
                folder_name = attraction.get('folder', '')
                break
        
        if not folder_name:
            return jsonify({'success': False, 'message': 'Достопримечательность не найдена'})
        
        # Удаляем файл
        file_path = os.path.join(app.static_folder, 'images', 'attraction-block', folder_name, secure_filename(filename))
        
        if os.path.exists(file_path):
            os.remove(file_path)
            
            # Удаляем из списка изображений
            for i, attraction in enumerate(attractions):
                if attraction['id'] == attraction_id and 'images' in attractions[i]:
                    if filename in attractions[i]['images']:
                        attractions[i]['images'].remove(filename)
                        break
            
            save_attractions(attractions)
            return jsonify({'success': True, 'message': 'Изображение удалено'})
        else:
            return jsonify({'success': False, 'message': 'Файл не найден'})
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'Ошибка: {str(e)}'})

# Маршруты для галереи (эти маршруты должны быть публичными)
@app.route('/gallery-data')
def get_gallery_data():
    """Получение данных галереи для главной страницы"""
    try:
        images_info = get_gallery_images()
        
        # Формируем данные для галереи
        gallery_data = []
        for img_info in images_info:
            gallery_data.append({
                'path': img_info['path'],
                'alt': f'Фотография парка {img_info["filename"]}',
                'filename': img_info['filename'],
                'size': img_info['size']
            })
        
        return jsonify({
            'success': True,
            'images': gallery_data,
            'count': len(gallery_data)
        })
    except Exception as e:
        print(f"Ошибка при получении данных галереи: {e}")
        return jsonify({
            'success': False,
            'message': 'Ошибка загрузки галереи',
            'images': []
        })

# Маршруты для управления галереей (требуют авторизации)
@app.route('/admin/gallery')
@login_required
def admin_gallery():
    """HTML страница управления галереей"""
    return render_template('admin_gallery.html', active_tab='gallery')

@app.route('/admin/gallery/data')  # Изменено с /api на /data
@login_required
def admin_gallery_data():  # Изменено имя функции
    """API для получения данных галереи в формате JSON"""
    try:
        images_info = get_gallery_images()
        return jsonify({'success': True, 'images': images_info})
    except Exception as e:
        print(f"Ошибка при загрузке галереи: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/admin/gallery/upload', methods=['POST'])
@login_required
def upload_gallery_image():
    """Загрузка изображения в галерею"""
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'message': 'Файл не найден в запросе'})
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({'success': False, 'message': 'Файл не выбран'})
        
        # Проверка размера файла
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({'success': False, 'message': f'Файл слишком большой. Максимальный размер: {MAX_FILE_SIZE // (1024*1024)}MB'})
        
        # Проверка расширения файла
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'message': 'Неподдерживаемый формат файла. Разрешенные форматы: PNG, JPG, JPEG, GIF, WEBP'})
        
        # Создаем безопасное имя файла
        original_filename = secure_filename(file.filename)
        name, ext = os.path.splitext(original_filename)
        
        # Генерируем уникальное имя файла
        unique_filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
        
        # Создаем папку, если ее нет
        upload_folder = os.path.join(app.static_folder, 'images', GALLERY_FOLDER)
        os.makedirs(upload_folder, exist_ok=True)
        
        # Сохраняем файл
        file_path = os.path.join(upload_folder, unique_filename)
        file.save(file_path)
        
        print(f"Файл сохранен в галерею: {file_path}")
        
        return jsonify({
            'success': True, 
            'message': 'Изображение успешно загружено в галерею',
            'filename': unique_filename,
            'path': f"images/{GALLERY_FOLDER}/{unique_filename}"
        })
        
    except Exception as e:
        print(f"Ошибка при загрузке изображения в галерею: {e}")
        return jsonify({'success': False, 'message': f'Ошибка при загрузке: {str(e)}'})

@app.route('/admin/gallery/delete', methods=['POST'])
@login_required
def delete_gallery_image():
    """Удаление изображения из галереи"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        
        if not filename:
            return jsonify({'success': False, 'message': 'Не указано имя файла'})
        
        # Проверяем, что файл находится в разрешенной директории
        safe_filename = secure_filename(filename)
        
        # Полный путь к файлу
        file_path = os.path.join(app.static_folder, 'images', GALLERY_FOLDER, safe_filename)
        
        # Проверяем, что файл существует и находится в правильной директории
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'message': 'Файл не найден'})
        
        # Удаляем файл
        os.remove(file_path)
        print(f"Файл удален из галереи: {file_path}")
        
        return jsonify({'success': True, 'message': 'Изображение успешно удалено из галереи'})
        
    except Exception as e:
        print(f"Ошибка при удалении изображения из галереи: {e}")
        return jsonify({'success': False, 'message': f'Ошибка при удалении: {str(e)}'})

if __name__ == '__main__':
    print("Запуск сервера Flask...")
    print(f"Данные хранятся в: {DATA_FILE}")
    print(f"Доступ к админ-панели: http://localhost:5000/login")
    print(f"Логин: admin, Пароль: admin")
    
    # Проверяем наличие изображений
    hero_images = get_hero_images()
    if hero_images:
        print(f"Найдено {len(hero_images)} изображений для слайдера:")
        for img in hero_images:
            print(f"  - {img}")
    else:
        print("ВНИМАНИЕ: В папке static/images/hero-section/ нет изображений!")
        print("Пожалуйста, добавьте изображения в формате jpg, jpeg, png, webp или gif")
    
    # Проверяем наличие папки для галереи
    gallery_images = get_gallery_images()
    if gallery_images:
        print(f"Найдено {len(gallery_images)} изображений в галерее:")
        for img in gallery_images:
            print(f"  - {img['filename']}")
    else:
        print("ВНИМАНИЕ: В папке static/images/gallery-section/ нет изображений!")
        print("Пожалуйста, загрузите изображения через админ-панель")
    
    app.run(debug=True, host='0.0.0.0', port=5011)