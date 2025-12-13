from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    return app.send_static_file('images/logo/favicon.png')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5011)