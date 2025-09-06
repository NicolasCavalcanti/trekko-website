from src.database import db
from src.models.user import User
from datetime import datetime
from sqlalchemy import text

class GuiaCadastur(db.Model):
    """Model for the guias_cadastur table with complete CADASTUR data"""
    __tablename__ = 'guias_cadastur'

    # Campos da tabela guias_cadastur
    idiomas = db.Column(db.Text)
    atividade_turistica = db.Column('atividade_turística', db.Text)
    uf = db.Column(db.Text)
    municipio = db.Column('município', db.Text)
    nome_completo = db.Column(db.Text)
    telefone_comercial = db.Column(db.Text)
    email_comercial = db.Column(db.Text)
    website = db.Column(db.Text)
    numero_do_certificado = db.Column('número_do_certificado', db.Text, primary_key=True)
    validade_do_certificado = db.Column(db.Text)
    municipio_de_atuacao = db.Column('município_de_atuação', db.Text)
    categorias = db.Column(db.Text)
    segmentos = db.Column(db.Text)
    guia_motorista = db.Column(db.BigInteger, default=0)

    @staticmethod
    def find_by_certificado(numero: str):
        """Return first Cadastur entry matching the given certificate number.

        The input may contain formatting characters; only digits are used for
        the lookup so callers can pass values as typed by the user."""
        clean = ''.join(filter(str.isdigit, numero))
        if not clean:
            return None
        return GuiaCadastur.query.filter_by(numero_do_certificado=clean).first()

    @staticmethod
    def find_with_user(numero: str):
        """Fetch Cadastur entry and any associated user by certificate number."""
        clean = ''.join(filter(str.isdigit, numero))
        if not clean:
            return None
        return (
            db.session.query(GuiaCadastur, User)
            .outerjoin(User, GuiaCadastur.numero_do_certificado == User.cadastur_number)
            .filter(GuiaCadastur.numero_do_certificado == clean)
            .first()
        )

    @staticmethod
    def validate_cadastur_exists(numero: str):
        """Validate if CADASTUR number exists in the official database"""
        clean = ''.join(filter(str.isdigit, numero))
        
        # If no digits found, check if it's a dash (valid in some cases)
        if not clean:
            if numero.strip() == '-':
                return False, "CADASTUR com hífen (-) não pode ser usado para registro"
            return False, "Número CADASTUR inválido"
        
        guia = GuiaCadastur.find_by_certificado(clean)
        if not guia:
            return False, "Número CADASTUR não encontrado na base oficial"
        
        return True, "CADASTUR válido"

    @staticmethod
    def validate_cadastur_available(numero: str):
        """Check if CADASTUR number is available (not already used by another user)"""
        clean = ''.join(filter(str.isdigit, numero))
        if not clean:
            return False, "Número CADASTUR inválido"
        
        # Check if already used by another user
        existing_user = User.query.filter_by(cadastur_number=clean).first()
        if existing_user:
            return False, "Número CADASTUR já está em uso por outro usuário"
        
        return True, "CADASTUR disponível"

    @staticmethod
    def validate_certificate_validity(numero: str):
        """Check if CADASTUR certificate is still valid"""
        clean = ''.join(filter(str.isdigit, numero))
        if not clean:
            return False, "Número CADASTUR inválido"
        
        guia = GuiaCadastur.find_by_certificado(clean)
        if not guia:
            return False, "CADASTUR não encontrado"
        
        if not guia.validade_do_certificado or guia.validade_do_certificado == '-':
            return True, "Certificado sem data de validade definida"
        
        try:
            # Parse the validity date (format: YYYY-MM-DD HH:MM:SS.ffffff)
            validade_str = guia.validade_do_certificado.split('.')[0]  # Remove microseconds
            validade = datetime.strptime(validade_str, '%Y-%m-%d %H:%M:%S')
            
            if validade < datetime.now():
                return False, f"Certificado vencido em {validade.strftime('%d/%m/%Y')}"
            
            return True, f"Certificado válido até {validade.strftime('%d/%m/%Y')}"
        except:
            return True, "Não foi possível verificar a validade do certificado"

    @staticmethod
    def get_guide_info(numero: str):
        """Get complete guide information from CADASTUR database"""
        clean = ''.join(filter(str.isdigit, numero))
        if not clean:
            return None
        
        guia = GuiaCadastur.find_by_certificado(clean)
        if not guia:
            return None
        
        return {
            'numero_certificado': guia.numero_do_certificado,
            'nome_completo': guia.nome_completo,
            'uf': guia.uf,
            'municipio': guia.municipio,
            'telefone_comercial': guia.telefone_comercial,
            'email_comercial': guia.email_comercial,
            'website': guia.website,
            'idiomas': guia.idiomas,
            'atividade_turistica': guia.atividade_turistica,
            'validade_certificado': guia.validade_do_certificado,
            'municipio_atuacao': guia.municipio_de_atuacao,
            'categorias': guia.categorias,
            'segmentos': guia.segmentos,
            'guia_motorista': bool(guia.guia_motorista)
        }

    @staticmethod
    def search_by_name(nome: str, limit: int = 10):
        """Search guides by name"""
        if not nome or len(nome) < 3:
            return []
        
        return GuiaCadastur.query.filter(
            GuiaCadastur.nome_completo.ilike(f'%{nome}%')
        ).limit(limit).all()

    @staticmethod
    def search_by_location(uf: str = None, municipio: str = None, limit: int = 10):
        """Search guides by location"""
        query = GuiaCadastur.query
        
        if uf:
            query = query.filter(GuiaCadastur.uf == uf.upper())
        
        if municipio:
            query = query.filter(GuiaCadastur.municipio.ilike(f'%{municipio}%'))
        
        return query.limit(limit).all()

    def to_dict(self):
        """Convert guide object to dictionary"""
        return {
            'numero_certificado': self.numero_do_certificado,
            'nome_completo': self.nome_completo,
            'uf': self.uf,
            'municipio': self.municipio,
            'telefone_comercial': self.telefone_comercial,
            'email_comercial': self.email_comercial,
            'website': self.website,
            'idiomas': self.idiomas,
            'atividade_turistica': self.atividade_turistica,
            'validade_certificado': self.validade_do_certificado,
            'municipio_atuacao': self.municipio_de_atuacao,
            'categorias': self.categorias,
            'segmentos': self.segmentos,
            'guia_motorista': bool(self.guia_motorista) if self.guia_motorista else False
        }

    def __repr__(self):
        return f'<GuiaCadastur {self.numero_do_certificado} - {self.nome_completo}>'

