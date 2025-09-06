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
        """Validate CADASTUR number format and existence"""
        if not cadastur_number:
            return False, "Número CADASTUR é obrigatório para guias"

        # Keep only digits
        clean_cadastur = ''.join(filter(str.isdigit, cadastur_number))

        # CADASTUR must have at least some digits and cannot be all the same
        if len(clean_cadastur) < 3:
            return False, "Número CADASTUR deve ter pelo menos 3 dígitos"
        
        if len(set(clean_cadastur)) == 1:
            return False, "Número CADASTUR não pode ter todos os dígitos iguais"

        # Import here to avoid circular imports
        from src.models.guia_cadastur import GuiaCadastur
        
        # Check if CADASTUR exists in official database
        exists, message = GuiaCadastur.validate_cadastur_exists(clean_cadastur)
        if not exists:
            return False, message
        
        # Check if CADASTUR is available (not used by another user)
        available, message = GuiaCadastur.validate_cadastur_available(clean_cadastur)
        if not available:
            return False, message
        
        # Check certificate validity
        valid, message = GuiaCadastur.validate_certificate_validity(clean_cadastur)
        if not valid:
            return False, message

        return True, "CADASTUR válido e disponível"
    
    def __repr__(self):
        return f'<User {self.email}>'
