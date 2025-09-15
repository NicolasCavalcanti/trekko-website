// admin-auth.js - controle de acesso e permissões básicas da área administrativa
class AdminGuard {
  static adminEmails = ['contato@trekko.com.br'];
  static allowedRoles = ['ADMIN', 'EDITOR', 'OPERADOR'];

  /**
   * Valida a existência de sessão e retorna o usuário autenticado.
   * Caso não haja usuário válido, faz o redirecionamento para o site público.
   */
  static requireAuth() {
    const data = localStorage.getItem('userData');
    if (!data) {
      alert('Acesso restrito. Faça login como administrador.');
      window.location.href = 'https://www.trekko.com.br/';
      return null;
    }
    try {
      const user = JSON.parse(data);
      const hasRole =
        AdminGuard.allowedRoles.includes(user.role) ||
        AdminGuard.adminEmails.includes(user.email);
      if (!hasRole) {
        alert('Apenas administradores podem acessar esta área.');
        window.location.href = 'https://www.trekko.com.br/';
        return null;
      }
      return user;
    } catch {
      localStorage.removeItem('userData');
      window.location.href = 'https://www.trekko.com.br/';
      return null;
    }
  }
}

/**
 * Gerencia permissões na UI através do atributo `data-permission`.
 * Elementos sem permissão ficam desabilitados.
 */
class PermissionManager {
  static rules = {
    ADMIN: ['*'],
    EDITOR: [
      'CMS',
      'TRILHAS',
      'EXPEDICOES',
      'GUIAS',
      'CLIENTES',
      'RESERVAS',
      'INTEGRACOES',
      'CONFIGURACOES',
    ],
    OPERADOR: ['EXPEDICOES', 'RESERVAS', 'CLIENTES', 'GUIAS'],
  };

  static apply(role) {
    const permissions = PermissionManager.rules[role] || [];
    const allowAll = permissions.includes('*');
    document.querySelectorAll('[data-permission]').forEach((el) => {
      const required = el.getAttribute('data-permission');
      const allowed = allowAll || permissions.includes(required);
      if (!allowed) {
        el.classList.add('pointer-events-none', 'opacity-50');
        el.setAttribute('title', 'Permissão insuficiente');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const user = AdminGuard.requireAuth();
  if (user) {
    PermissionManager.apply(user.role);
  }
});
