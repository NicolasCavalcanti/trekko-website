// Sistema de Regras de Negócio - Trekko
// Implementação das regras críticas para funcionamento comercial

class TrekkoBusinessRules {
    constructor() {
        this.config = {
            // Configurações de comissão
            commission: {
                global: 0.15, // 15% comissão global padrão
                overrides: {
                    guide: {}, // Override por guia específico
                    booking: {} // Override por reserva específica
                }
            },
            
            // Política de estorno por janelas de tempo
            refundPolicy: [
                { hours: 48, percentage: 1.0 }, // 100% até 48h
                { hours: 24, percentage: 0.5 }, // 50% até 24h
                { hours: 0, percentage: 0.0 }   // 0% no dia
            ],
            
            // Critérios para publicação de trilhas
            trailPublication: {
                requiredStatus: 'publicada',
                minPhotos: 1,
                requiredFields: ['name', 'description', 'location', 'difficulty', 'distance']
            },
            
            // Métricas de sucesso
            successMetrics: {
                trailRegistrationTime: 300, // 5 min em segundos
                uploadTime10Images: 30, // 30s para 10 imagens
                refundProcessingTime: 10, // 10s para registrar estorno
                criticalFailures: 0 // 0 falhas críticas permitidas
            }
        };
        
        this.auditLog = [];
    }

    // ===== SISTEMA DE COMISSÕES =====
    
    /**
     * Calcula comissão efetiva para uma transação
     * @param {number} amount - Valor da transação
     * @param {string} guideId - ID do guia
     * @param {string} bookingId - ID da reserva
     * @returns {object} Detalhes da comissão
     */
    calculateCommission(amount, guideId = null, bookingId = null) {
        let commissionRate = this.config.commission.global;
        let source = 'global';
        
        // Override por reserva específica (maior prioridade)
        if (bookingId && this.config.commission.overrides.booking[bookingId]) {
            commissionRate = this.config.commission.overrides.booking[bookingId];
            source = 'booking_override';
        }
        // Override por guia específico
        else if (guideId && this.config.commission.overrides.guide[guideId]) {
            commissionRate = this.config.commission.overrides.guide[guideId];
            source = 'guide_override';
        }
        
        const commissionAmount = amount * commissionRate;
        const netAmount = amount - commissionAmount;
        
        const result = {
            originalAmount: amount,
            commissionRate: commissionRate,
            commissionAmount: commissionAmount,
            netAmount: netAmount,
            source: source,
            timestamp: new Date().toISOString()
        };
        
        this.logAudit('commission_calculated', {
            guideId,
            bookingId,
            ...result
        });
        
        return result;
    }
    
    /**
     * Define override de comissão para guia específico
     */
    setGuideCommissionOverride(guideId, rate) {
        this.config.commission.overrides.guide[guideId] = rate;
        this.logAudit('guide_commission_override_set', {
            guideId,
            rate,
            previousRate: this.config.commission.global
        });
    }
    
    /**
     * Define override de comissão para reserva específica
     */
    setBookingCommissionOverride(bookingId, rate) {
        this.config.commission.overrides.booking[bookingId] = rate;
        this.logAudit('booking_commission_override_set', {
            bookingId,
            rate
        });
    }

    // ===== SISTEMA DE ESTORNOS =====
    
    /**
     * Calcula valor de estorno baseado na política de janelas
     * @param {number} amount - Valor original
     * @param {Date} bookingDate - Data da reserva
     * @param {Date} requestDate - Data da solicitação de estorno
     * @returns {object} Detalhes do estorno
     */
    calculateRefund(amount, bookingDate, requestDate = new Date()) {
        const hoursUntilBooking = (bookingDate - requestDate) / (1000 * 60 * 60);
        
        let refundPercentage = 0;
        let policyApplied = null;
        
        // Encontra a política aplicável
        for (const policy of this.config.refundPolicy) {
            if (hoursUntilBooking >= policy.hours) {
                refundPercentage = policy.percentage;
                policyApplied = policy;
                break;
            }
        }
        
        const refundAmount = amount * refundPercentage;
        const retainedAmount = amount - refundAmount;
        
        const result = {
            originalAmount: amount,
            hoursUntilBooking: Math.round(hoursUntilBooking * 100) / 100,
            refundPercentage: refundPercentage,
            refundAmount: refundAmount,
            retainedAmount: retainedAmount,
            policyApplied: policyApplied,
            timestamp: new Date().toISOString()
        };
        
        this.logAudit('refund_calculated', result);
        
        return result;
    }
    
    /**
     * Processa estorno completo
     */
    async processRefund(bookingId, amount, bookingDate, reason = '') {
        const startTime = Date.now();
        
        try {
            const refundDetails = this.calculateRefund(amount, bookingDate);
            
            // Simular processamento no PSP
            await this.processRefundWithPSP(bookingId, refundDetails.refundAmount);
            
            // Atualizar base de dados
            await this.updateRefundInDatabase(bookingId, refundDetails);
            
            const processingTime = (Date.now() - startTime) / 1000;
            
            const result = {
                bookingId,
                ...refundDetails,
                reason,
                processingTime,
                status: 'completed'
            };
            
            this.logAudit('refund_processed', result);
            
            // Verificar métrica de sucesso
            if (processingTime > this.config.successMetrics.refundProcessingTime) {
                this.logAudit('metric_violation', {
                    metric: 'refund_processing_time',
                    expected: this.config.successMetrics.refundProcessingTime,
                    actual: processingTime
                });
            }
            
            return result;
            
        } catch (error) {
            this.logAudit('refund_failed', {
                bookingId,
                error: error.message,
                processingTime: (Date.now() - startTime) / 1000
            });
            throw error;
        }
    }
    
    // Simulação de integração com PSP
    async processRefundWithPSP(bookingId, amount) {
        // Simular delay de rede
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
        
        // Simular possível falha (5% chance)
        if (Math.random() < 0.05) {
            throw new Error('PSP_CONNECTION_ERROR');
        }
        
        return {
            pspTransactionId: `refund_${bookingId}_${Date.now()}`,
            status: 'processed',
            amount: amount
        };
    }
    
    // Simulação de atualização no banco
    async updateRefundInDatabase(bookingId, refundDetails) {
        // Simular operação de banco
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
            updated: true,
            bookingId,
            refundDetails
        };
    }

    // ===== CÁLCULO DE REPASSES =====
    
    /**
     * Calcula repasse ao guia
     * @param {number} capturedAmount - Valor capturado
     * @param {number} fees - Taxas (cartão, etc)
     * @param {object} commissionDetails - Detalhes da comissão
     * @returns {object} Detalhes do repasse
     */
    calculatePayout(capturedAmount, fees, commissionDetails) {
        const netAmount = capturedAmount - fees - commissionDetails.commissionAmount;
        
        const result = {
            capturedAmount,
            fees,
            commissionAmount: commissionDetails.commissionAmount,
            commissionRate: commissionDetails.commissionRate,
            payoutAmount: netAmount,
            timestamp: new Date().toISOString()
        };
        
        this.logAudit('payout_calculated', result);
        
        return result;
    }

    // ===== VALIDAÇÃO DE TRILHAS =====
    
    /**
     * Valida se trilha pode ser publicada
     * @param {object} trail - Dados da trilha
     * @returns {object} Resultado da validação
     */
    validateTrailForPublication(trail) {
        const errors = [];
        const warnings = [];
        
        // Verificar status
        if (trail.status !== this.config.trailPublication.requiredStatus) {
            errors.push(`Status deve ser '${this.config.trailPublication.requiredStatus}', atual: '${trail.status}'`);
        }
        
        // Verificar fotos
        const photoCount = trail.photos ? trail.photos.length : 0;
        if (photoCount < this.config.trailPublication.minPhotos) {
            errors.push(`Mínimo ${this.config.trailPublication.minPhotos} foto(s) necessária(s), atual: ${photoCount}`);
        }
        
        // Verificar campos obrigatórios
        for (const field of this.config.trailPublication.requiredFields) {
            if (!trail[field] || trail[field].toString().trim() === '') {
                errors.push(`Campo obrigatório '${field}' não preenchido`);
            }
        }
        
        // Verificações de qualidade (warnings)
        if (trail.description && trail.description.length < 100) {
            warnings.push('Descrição muito curta (recomendado: mínimo 100 caracteres)');
        }
        
        if (photoCount < 3) {
            warnings.push('Recomendado pelo menos 3 fotos para melhor apresentação');
        }
        
        const isValid = errors.length === 0;
        const result = {
            isValid,
            canPublish: isValid,
            errors,
            warnings,
            trailId: trail.id,
            timestamp: new Date().toISOString()
        };
        
        this.logAudit('trail_validation', result);
        
        return result;
    }

    // ===== SISTEMA DE AUDITORIA =====
    
    /**
     * Registra ação administrativa no log de auditoria
     */
    logAudit(action, data = {}) {
        const logEntry = {
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            action,
            data,
            userId: this.getCurrentUserId(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
            ip: this.getCurrentUserIP()
        };
        
        this.auditLog.push(logEntry);
        
        // Manter apenas os últimos 1000 logs em memória
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-1000);
        }
        
        // Em produção, enviar para sistema de logging
        this.persistAuditLog(logEntry);
        
        return logEntry;
    }
    
    /**
     * Busca logs de auditoria
     */
    getAuditLogs(filters = {}) {
        let logs = [...this.auditLog];
        
        if (filters.action) {
            logs = logs.filter(log => log.action === filters.action);
        }
        
        if (filters.userId) {
            logs = logs.filter(log => log.userId === filters.userId);
        }
        
        if (filters.startDate) {
            logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
        }
        
        if (filters.endDate) {
            logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
        }
        
        return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    // Métodos auxiliares
    getCurrentUserId() {
        // Em produção, obter do contexto de autenticação
        return localStorage.getItem('currentUserId') || 'anonymous';
    }
    
    getCurrentUserIP() {
        // Em produção, obter do servidor
        return '127.0.0.1';
    }
    
    async persistAuditLog(logEntry) {
        // Em produção, enviar para API de logging
        console.log('🔍 Audit Log:', logEntry);
    }

    // ===== MÉTRICAS E MONITORAMENTO =====
    
    /**
     * Verifica métricas de sucesso
     */
    checkSuccessMetrics() {
        const recentLogs = this.getAuditLogs({
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // últimas 24h
        });
        
        const metrics = {
            trailRegistrations: recentLogs.filter(log => log.action === 'trail_created').length,
            refundProcessingTimes: recentLogs
                .filter(log => log.action === 'refund_processed')
                .map(log => log.data.processingTime),
            criticalFailures: recentLogs.filter(log => log.action === 'critical_failure').length,
            metricViolations: recentLogs.filter(log => log.action === 'metric_violation').length
        };
        
        return metrics;
    }
}

// Instância global
window.TrekkoBusinessRules = TrekkoBusinessRules;
window.trekkoRules = new TrekkoBusinessRules();

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrekkoBusinessRules;
}

