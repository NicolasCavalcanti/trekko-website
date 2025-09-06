from src.database import db
from datetime import datetime
import hashlib
import secrets

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    user_type = db.Column(db.String(20), nullable=False, default='trekker')  # 'trekker' or 'guia'
    cadastur_number = db.Column(db.String(20), nullable=True)  # Only for guides
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, name, email, password, user_type='trekker', cadastur_number=None):
        self.name = name
        self.email = email
        self.set_password(password)
        self.user_type = user_type
        self.cadastur_number = cadastur_number
    
    def set_password(self, password):
        """Hash and set password"""
        salt = secrets.token_hex(16)
        self.password_hash = hashlib.pbkdf2_hmac('sha256', 
                                                password.encode('utf-8'), 
                                                salt.encode('utf-8'), 
                                                100000).hex() + ':' + salt
    
    def check_password(self, password):
        """Check if provided password matches stored hash"""
        try:
            stored_hash, salt = self.password_hash.split(':')
            return stored_hash == hashlib.pbkdf2_hmac('sha256', 
                                                     password.encode('utf-8'), 
                                                     salt.encode('utf-8'), 
                                                     100000).hex()
        except:
            return False
    
    def to_dict(self):
        """Convert user object to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'user_type': self.user_type,
            'cadastur_number': self.cadastur_number,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @staticmethod
    def validate_cadastur(cadastur_number):
        """Validate CADASTUR number format"""
        if not cadastur_number:
            return False, "Número CADASTUR é obrigatório para guias"
        
        clean_cadastur = cadastur_number.strip()

        if not clean_cadastur.isdigit():
            return False, "CADASTUR deve conter apenas números"

        if len(set(clean_cadastur)) == 1:
            return False, "Número CADASTUR inválido"

        return True, "CADASTUR válido"
    
    def __repr__(self):
        return f'<User {self.email}>'
