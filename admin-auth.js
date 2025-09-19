// admin-auth.js - controle de acesso e permissões básicas da área administrativa
class AdminGuard {
  static adminEmails = ['contato@trekko.com.br'];

  static allowedRoles = ['ADMIN', 'EDITOR', 'OPERADOR', 'GUIA'];

  static currentUser = null;

  static currentPermissions = [];

  static sessionPromise = null;

  static async requireAuth() {
    try {
      return await AdminGuard.loadSession();
    } catch (error) {
      AdminGuard.handleUnauthorized(error);
      return null;
    }
  }

  static async loadSession() {
    if (AdminGuard.currentUser) {
      PermissionManager.apply(AdminGuard.currentUser.role, AdminGuard.currentPermissions);
      return AdminGuard.currentUser;
    }

    if (AdminGuard.sessionPromise) {
      return AdminGuard.sessionPromise;
    }

    AdminGuard.sessionPromise = AdminGuard.fetchSession()
      .finally(() => {
        AdminGuard.sessionPromise = null;
      });

    return AdminGuard.sessionPromise;
  }

  static async fetchSession() {
    const api = window.trekkoAdminApi;
    if (!api) {
      throw new Error('API helper not available');
    }

    try {
      await api.ensureCsrfToken();
    } catch (error) {
      console.warn('Falha ao preparar token CSRF', error);
    }

    const response = await api.fetch('/auth/me', { method: 'GET' });

    if (response.status === 401 || response.status === 403) {
      throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) {
      throw new Error(`SESSION_REQUEST_FAILED_${response.status}`);
    }

    const payload = await response.json().catch(() => ({}));

    if (payload?.csrfToken) {
      api.setCsrfToken(payload.csrfToken);
    }

    if (!payload?.authenticated || !payload?.user) {
      throw new Error('UNAUTHENTICATED');
    }

    const user = payload.user;
    const roles = Array.isArray(payload.roles) ? payload.roles.map((role) => role.toUpperCase()) : [];
    const normalizedRole = (user.role || '').toUpperCase();
    const effectiveRoles = roles.length ? roles : [normalizedRole];

    const allowed = effectiveRoles.some((role) => AdminGuard.allowedRoles.includes(role)) ||
      AdminGuard.adminEmails.includes(user.email);

    if (!allowed) {
      throw new Error('INSUFFICIENT_ROLE');
    }

    const permissions = Array.isArray(payload.permissions)
      ? payload.permissions.map((permission) => permission.toUpperCase())
      : [];

    AdminGuard.currentUser = user;
    AdminGuard.currentPermissions = permissions;
    PermissionManager.apply(user.role, permissions);

    return user;
  }

  static handleUnauthorized(error) {
    console.warn('AdminGuard: acesso não autorizado', error);
    alert('Acesso restrito. Faça login como administrador.');
    window.location.href = 'https://www.trekko.com.br/';
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
    GUIA: ['EXPEDICOES', 'RESERVAS'],
  };

  static apply(role, explicitPermissions) {
    const normalizedRole = typeof role === 'string' ? role.toUpperCase() : '';
    const basePermissions = PermissionManager.rules[normalizedRole] || [];
    const permissions = Array.isArray(explicitPermissions) && explicitPermissions.length
      ? explicitPermissions
      : basePermissions;
    const allowAll = permissions.includes('*');

    document.querySelectorAll('[data-permission]').forEach((el) => {
      const required = el.getAttribute('data-permission');
      const allowed = allowAll || permissions.includes(required);
      if (!allowed) {
        el.classList.add('pointer-events-none', 'opacity-50');
        el.setAttribute('title', 'Permissão insuficiente');
        el.setAttribute('aria-disabled', 'true');
        el.dataset.permissionDenied = 'true';
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await AdminGuard.requireAuth();
});
