// admin-auth.js - restrição de acesso a administradores
class AdminGuard {
  static check() {
    const data = localStorage.getItem('userData');
    if (!data) {
      alert('Acesso restrito. Faça login como administrador.');
      window.location.href = 'https://www.trekko.com.br/';
      return;
    }
    try {
      const user = JSON.parse(data);
      if (user.role !== 'admin' && user.role !== 'ADMIN') {
        alert('Apenas administradores podem acessar esta área.');
        window.location.href = 'https://www.trekko.com.br/';
      }
    } catch {
      localStorage.removeItem('userData');
      window.location.href = 'https://www.trekko.com.br/';
    }
  }
}

document.addEventListener('DOMContentLoaded', AdminGuard.check);
