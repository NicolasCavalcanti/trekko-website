from src.database import db
from src.models.user import User
import unicodedata
import re


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
    def _normalize_name(nome: str) -> str:
        """Return a case-insensitive, accent-free representation of a name."""
        if not nome:
            return ""
        normalized = unicodedata.normalize("NFD", nome)
        without_accents = "".join(c for c in normalized if not unicodedata.combining(c))
        return re.sub(r"\s+", " ", without_accents).strip().lower()

    @staticmethod
    def names_match(registry_name: str, provided_name: str) -> bool:
        """Compare two names ignoring case, accents and extra spaces."""
        return (
            GuiaCadastur._normalize_name(registry_name)
            == GuiaCadastur._normalize_name(provided_name)
        )

    @staticmethod
    def find_with_user(numero: str):
        """Fetch Cadastur entry and any associated user in a single query."""
        clean = ''.join(filter(str.isdigit, numero))
        if not clean:
            return None
        return (
            db.session.query(GuiaCadastur, User)
            .outerjoin(User, GuiaCadastur.numero_do_certificado == User.cadastur_number)
            .filter(GuiaCadastur.numero_do_certificado == clean)
            .first()
        )

    def to_dict(self):
        return {
            'id': self.id,
            'numero_do_certificado': self.numero_do_certificado,
            'nome_completo': self.nome_completo,
        }

