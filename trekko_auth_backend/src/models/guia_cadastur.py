from src.database import db

class GuiaCadastur(db.Model):
    """Model for the guias_cadastur table"""
    __tablename__ = 'guias_cadastur'

    id = db.Column(db.Integer, primary_key=True)
    numero_do_certificado = db.Column('número_do_certificado', db.String(20), unique=True, nullable=False)
    nome_completo = db.Column('nome_completo', db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'numero_do_certificado': self.numero_do_certificado,
            'nome_completo': self.nome_completo,
        }
