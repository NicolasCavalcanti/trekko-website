from flask import Blueprint, request, jsonify
from src.models.user import User
from src.models.guia_cadastur import GuiaCadastur
from src.database import db
import re

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user with CADASTUR support for guides"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'email', 'password', 'user_type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'Campo {field} é obrigatório'
                }), 400
        
        name = data['name'].strip()
        email = data['email'].strip().lower()
        password = data['password']
        user_type = data['user_type']
        cadastur_number = data.get('cadastur_number', '').strip()
        
        # Validate email format
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return jsonify({
                'success': False,
                'message': 'Formato de email inválido'
            }), 400
        
        # Validate password strength
        if len(password) < 6:
            return jsonify({
                'success': False,
                'message': 'Senha deve ter pelo menos 6 caracteres'
            }), 400
        
        # Validate user type
        if user_type not in ['trekker', 'guia']:
            return jsonify({
                'success': False,
                'message': 'Tipo de usuário inválido'
            }), 400
        
        # Check if email already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({
                'success': False,
                'message': 'Email já está em uso'
            }), 400
        
        # Validate CADASTUR for guides
        if user_type == 'guia':
            is_valid, message = User.validate_cadastur(cadastur_number)
            if not is_valid:
                return jsonify({'success': False, 'message': message}), 400

            result = GuiaCadastur.find_with_user(cadastur_number, name)
            clean_cadastur = ''.join(filter(str.isdigit, cadastur_number))
            if not result:
                return jsonify({
                    'success': False,
                    'message': 'Número CADASTUR e nome não encontrados na base oficial'
                }), 400

            guia_entry, existing_user = result
            if existing_user is not None:
                return jsonify({'success': False, 'message': 'Número CADASTUR já está em uso'}), 400

            cadastur_number = clean_cadastur
        else:
            cadastur_number = None  # Ensure trekkers don't have CADASTUR
        
        # Create new user
        new_user = User(
            name=name,
            email=email,
            password=password,
            user_type=user_type,
            cadastur_number=cadastur_number
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Usuário cadastrado com sucesso!',
            'user': new_user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Erro interno do servidor: {str(e)}'
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({
                'success': False,
                'message': 'Email e senha são obrigatórios'
            }), 400
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            return jsonify({
                'success': False,
                'message': 'Email ou senha incorretos'
            }), 401
        
        if not user.is_active:
            return jsonify({
                'success': False,
                'message': 'Conta desativada'
            }), 401
        
        return jsonify({
            'success': True,
            'message': 'Login realizado com sucesso!',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erro interno do servidor: {str(e)}'
        }), 500

@auth_bp.route('/validate-cadastur', methods=['POST'])
def validate_cadastur():
    """Validate CADASTUR number"""
    try:
        data = request.get_json()
        cadastur_number = data.get('cadastur_number', '').strip()
        name = data.get('name', '').strip()

        if not cadastur_number or not name:
            return jsonify({'valid': False, 'message': 'Número CADASTUR e nome são obrigatórios'}), 400

        is_valid, message = User.validate_cadastur(cadastur_number)
        clean_cadastur = ''.join(filter(str.isdigit, cadastur_number))

        if is_valid:
            result = GuiaCadastur.find_with_user(clean_cadastur, name)
            if not result:
                is_valid = False
                message = "Número CADASTUR e nome não encontrados na base oficial"
            else:
                guia_entry, existing_user = result
                if existing_user is not None:
                    is_valid = False
                    message = "Número CADASTUR já está em uso"

        return jsonify({
            'valid': is_valid,
            'message': message
        }), 200
        
    except Exception as e:
        return jsonify({
            'valid': False,
            'message': f'Erro ao validar CADASTUR: {str(e)}'
        }), 500

@auth_bp.route('/users', methods=['GET'])
def get_users():
    """Get all users (for testing purposes)"""
    try:
        users = User.query.all()
        return jsonify({
            'success': True,
            'users': [user.to_dict() for user in users]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erro ao buscar usuários: {str(e)}'
        }), 500

