import re

def update_html_paths():
    with open('templates/index.html', 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Заменяем пути для CSS
    content = re.sub(r'href="\./css/', 'href="{{ url_for(\'static\', filename=\'css/', content)
    content = content.replace('href="{{ url_for(\'static\', filename=\'css/', 'href="{{ url_for(\'static\', filename=\'css/')
    
    # Заменяем пути для JS
    content = re.sub(r'src="\./js/', 'src="{{ url_for(\'static\', filename=\'js/', content)
    
    # Заменяем пути для изображений
    content = re.sub(r'src="\./images/', 'src="{{ url_for(\'static\', filename=\'images/', content)
    content = re.sub(r'data-bg="\./images/', 'data-bg="{{ url_for(\'static\', filename=\'images/', content)
    content = re.sub(r'url\(\./images/', 'url({{ url_for(\'static\', filename=\'images/', content)
    content = re.sub(r"url\('\./images/", "url('{{ url_for('static', filename='images/", content)
    content = re.sub(r'url\("\./images/', 'url("{{ url_for(\'static\', filename=\'images/', content)
    
    # Закрываем все url_for выражения
    content = content.replace('filename=\'css/', 'filename=\'css/\') }}')
    content = content.replace('filename=\'js/', 'filename=\'js/\') }}')
    content = content.replace('filename=\'images/', 'filename=\'images/\') }}')
    
    with open('templates/index.html', 'w', encoding='utf-8') as file:
        file.write(content)
    
    print("Пути в HTML обновлены!")

if __name__ == '__main__':
    update_html_paths()