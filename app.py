import os
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
import json
from functools import wraps
import glob
import uuid
from werkzeug.utils import secure_filename

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

# Путь к файлу с данными страницы
DATA_FILE = 'page_data.json'

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
        print(f"Данные сохранены в {DATA_FILE}")
        return True
    except Exception as e:
        print(f"Ошибка при сохранении данных: {e}")
        return False

def login_required(f):
    """Декоратор для защиты маршрутов, требующих авторизации"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    """Главная страница"""
    page_data = load_page_data()
    hero_images = get_hero_images()
    return render_template('index.html', page_data=page_data, hero_images=hero_images)

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
    """Административная панель"""
    page_data = load_page_data()
    images_info = get_image_info()
    return render_template('admin.html', page_data=page_data, images_info=images_info)

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
        # Проверяем, есть ли файл в запросе
        if 'image' not in request.files:
            return jsonify({'success': False, 'message': 'Файл не найден в запросе'})
        
        file = request.files['image']
        
        # Если пользователь не выбрал файл
        if file.filename == '':
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

# Инициализация при запуске
# init_data_file()

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
    
    app.run(debug=True, host='0.0.0.0', port=5011)