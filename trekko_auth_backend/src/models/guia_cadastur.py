from src.database import db
from sqlalchemy import func
from src.models.user import User

class GuiaCadastur(db.Model):
    """Model for the guias_cadastur table"""
    __tablename__ = 'guias_cadastur'

    id = db.Column(db.Integer, primary_key=True)
    numero_do_certificado = db.Column('número_do_certificado', db.String(20), unique=True, nullable=False)
    nome_completo = db.Column('nome_completo', db.Text)

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
    def find_with_user(numero: str, nome: str):
        """Fetch Cadastur entry and any associated user in a single query."""
        clean = ''.join(filter(str.isdigit, numero))
        if not clean or not nome:
            return None
        return (
            db.session.query(GuiaCadastur, User)
            .outerjoin(User, GuiaCadastur.numero_do_certificado == User.cadastur_number)
            .filter(
                GuiaCadastur.numero_do_certificado == clean,
                func.lower(GuiaCadastur.nome_completo) == nome.lower()
            )
            .first()
        )

    def to_dict(self):
        return {
            'id': self.id,
            'numero_do_certificado': self.numero_do_certificado,
            'nome_completo': self.nome_completo,
        }
