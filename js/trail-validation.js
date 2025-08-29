// Sistema de Validação de Trilhas - Trekko
// Implementa validações para publicação de trilhas conforme regras de negócio

class TrailValidationSystem {
    constructor() {
        this.validationRules = {
            // Campos obrigatórios
            requiredFields: [
                { field: 'name', minLength: 3, maxLength: 100 },
                { field: 'description', minLength: 50, maxLength: 2000 },
                { field: 'location', minLength: 5, maxLength: 200 },
                { field: 'difficulty', enum: ['Fácil', 'Moderado', 'Difícil', 'Muito difícil', 'Extremo'] },
                { field: 'distance', type: 'number', min: 0.1, max: 1000 },
                { field: 'duration', minLength: 2, maxLength: 50 }
            ],
            
            // Validações de fotos
            photos: {
                minCount: 1,
                recommendedCount: 3,
                maxCount: 10,
                maxSizePerPhoto: 5 * 1024 * 1024, // 5MB
                allowedFormats: ['jpg', 'jpeg', 'png', 'webp']
            },
            
            // Status válidos
            validStatuses: ['rascunho', 'em_revisao', 'publicada', 'pausada', 'arquivada'],
            publishableStatus: 'publicada'
        };
        
        this.uploadProgress = new Map();
    }

    /**
     * Valida trilha completa para publicação
     */
    validateTrailForPublication(trail) {
        const validation = {
            isValid: true,
            canPublish: false,
            errors: [],
            warnings: [],
            fieldValidations: {},
            photoValidation: null,
            timestamp: new Date().toISOString()
        };

        // Validar campos obrigatórios
        this.validateRequiredFields(trail, validation);
        
        // Validar fotos
        this.validatePhotos(trail, validation);
        
        // Validar status
        this.validateStatus(trail, validation);
        
        // Validações específicas por tipo de trilha
        this.validateSpecificRules(trail, validation);
        
        // Determinar se pode publicar
        validation.canPublish = validation.isValid && 
                               trail.status === this.validationRules.publishableStatus &&
                               this.hasMinimumPhotos(trail);
        
        // Log da validação
        if (window.trekkoRules) {
            window.trekkoRules.logAudit('trail_validation_performed', {
                trailId: trail.id,
                validation: validation
            });
        }
        
        return validation;
    }

    /**
     * Valida campos obrigatórios
     */
    validateRequiredFields(trail, validation) {
        for (const rule of this.validationRules.requiredFields) {
            const fieldValidation = this.validateField(trail[rule.field], rule);
            validation.fieldValidations[rule.field] = fieldValidation;
            
            if (!fieldValidation.isValid) {
                validation.isValid = false;
                validation.errors.push(...fieldValidation.errors);
            }
            
            if (fieldValidation.warnings.length > 0) {
                validation.warnings.push(...fieldValidation.warnings);
            }
        }
    }

    /**
     * Valida campo individual
     */
    validateField(value, rule) {
        const fieldValidation = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Verificar se campo existe
        if (value === undefined || value === null || value === '') {
            fieldValidation.isValid = false;
            fieldValidation.errors.push(`Campo '${rule.field}' é obrigatório`);
            return fieldValidation;
        }

        // Validar tipo
        if (rule.type === 'number') {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                fieldValidation.isValid = false;
                fieldValidation.errors.push(`Campo '${rule.field}' deve ser um número`);
                return fieldValidation;
            }
            
            if (rule.min !== undefined && numValue < rule.min) {
                fieldValidation.isValid = false;
                fieldValidation.errors.push(`Campo '${rule.field}' deve ser maior que ${rule.min}`);
            }
            
            if (rule.max !== undefined && numValue > rule.max) {
                fieldValidation.isValid = false;
                fieldValidation.errors.push(`Campo '${rule.field}' deve ser menor que ${rule.max}`);
            }
        }

        // Validar string
        if (typeof value === 'string') {
            if (rule.minLength && value.length < rule.minLength) {
                fieldValidation.isValid = false;
                fieldValidation.errors.push(`Campo '${rule.field}' deve ter pelo menos ${rule.minLength} caracteres`);
            }
            
            if (rule.maxLength && value.length > rule.maxLength) {
                fieldValidation.isValid = false;
                fieldValidation.errors.push(`Campo '${rule.field}' deve ter no máximo ${rule.maxLength} caracteres`);
            }
            
            // Warning para descrições muito curtas
            if (rule.field === 'description' && value.length < 100) {
                fieldValidation.warnings.push('Descrição muito curta. Recomendado pelo menos 100 caracteres para melhor SEO');
            }
        }

        // Validar enum
        if (rule.enum && !rule.enum.includes(value)) {
            fieldValidation.isValid = false;
            fieldValidation.errors.push(`Campo '${rule.field}' deve ser um dos valores: ${rule.enum.join(', ')}`);
        }

        return fieldValidation;
    }

    /**
     * Valida fotos da trilha
     */
    validatePhotos(trail, validation) {
        const photos = trail.photos || [];
        const photoValidation = {
            isValid: true,
            errors: [],
            warnings: [],
            count: photos.length,
            validPhotos: 0,
            invalidPhotos: []
        };

        // Verificar quantidade mínima
        if (photos.length < this.validationRules.photos.minCount) {
            photoValidation.isValid = false;
            photoValidation.errors.push(`Mínimo ${this.validationRules.photos.minCount} foto(s) necessária(s)`);
            validation.isValid = false;
        }

        // Warning para quantidade recomendada
        if (photos.length < this.validationRules.photos.recommendedCount) {
            photoValidation.warnings.push(`Recomendado pelo menos ${this.validationRules.photos.recommendedCount} fotos para melhor apresentação`);
        }

        // Verificar quantidade máxima
        if (photos.length > this.validationRules.photos.maxCount) {
            photoValidation.isValid = false;
            photoValidation.errors.push(`Máximo ${this.validationRules.photos.maxCount} fotos permitidas`);
            validation.isValid = false;
        }

        // Validar cada foto
        photos.forEach((photo, index) => {
            const photoResult = this.validateSinglePhoto(photo, index);
            if (photoResult.isValid) {
                photoValidation.validPhotos++;
            } else {
                photoValidation.invalidPhotos.push(photoResult);
                photoValidation.errors.push(...photoResult.errors);
            }
        });

        validation.photoValidation = photoValidation;
        
        if (photoValidation.errors.length > 0) {
            validation.errors.push(...photoValidation.errors);
        }
        
        if (photoValidation.warnings.length > 0) {
            validation.warnings.push(...photoValidation.warnings);
        }
    }

    /**
     * Valida foto individual
     */
    validateSinglePhoto(photo, index) {
        const photoValidation = {
            index,
            isValid: true,
            errors: [],
            warnings: []
        };

        // Verificar se foto existe
        if (!photo || (!photo.url && !photo.file)) {
            photoValidation.isValid = false;
            photoValidation.errors.push(`Foto ${index + 1}: arquivo não encontrado`);
            return photoValidation;
        }

        // Validar formato se for arquivo
        if (photo.file) {
            const fileName = photo.file.name || '';
            const extension = fileName.split('.').pop()?.toLowerCase();
            
            if (!this.validationRules.photos.allowedFormats.includes(extension)) {
                photoValidation.isValid = false;
                photoValidation.errors.push(`Foto ${index + 1}: formato '${extension}' não permitido. Use: ${this.validationRules.photos.allowedFormats.join(', ')}`);
            }

            // Validar tamanho
            if (photo.file.size > this.validationRules.photos.maxSizePerPhoto) {
                photoValidation.isValid = false;
                const maxSizeMB = this.validationRules.photos.maxSizePerPhoto / (1024 * 1024);
                photoValidation.errors.push(`Foto ${index + 1}: tamanho muito grande. Máximo ${maxSizeMB}MB`);
            }
        }

        // Validar dimensões mínimas (se disponível)
        if (photo.width && photo.height) {
            if (photo.width < 800 || photo.height < 600) {
                photoValidation.warnings.push(`Foto ${index + 1}: resolução baixa (${photo.width}x${photo.height}). Recomendado: mínimo 800x600`);
            }
        }

        return photoValidation;
    }

    /**
     * Valida status da trilha
     */
    validateStatus(trail, validation) {
        if (!trail.status) {
            validation.isValid = false;
            validation.errors.push('Status da trilha é obrigatório');
            return;
        }

        if (!this.validationRules.validStatuses.includes(trail.status)) {
            validation.isValid = false;
            validation.errors.push(`Status '${trail.status}' inválido. Valores permitidos: ${this.validationRules.validStatuses.join(', ')}`);
        }
    }

    /**
     * Validações específicas por tipo de trilha
     */
    validateSpecificRules(trail, validation) {
        // Validar coordenadas se fornecidas
        if (trail.coordinates) {
            if (!this.isValidCoordinate(trail.coordinates.lat, 'latitude')) {
                validation.warnings.push('Coordenada de latitude inválida');
            }
            if (!this.isValidCoordinate(trail.coordinates.lng, 'longitude')) {
                validation.warnings.push('Coordenada de longitude inválida');
            }
        }

        // Validar preço se fornecido
        if (trail.price !== undefined && trail.price !== null) {
            if (trail.price < 0) {
                validation.isValid = false;
                validation.errors.push('Preço não pode ser negativo');
            }
        }

        // Validar capacidade máxima
        if (trail.maxCapacity && trail.maxCapacity < 1) {
            validation.isValid = false;
            validation.errors.push('Capacidade máxima deve ser pelo menos 1 pessoa');
        }
    }

    /**
     * Verifica se tem fotos mínimas
     */
    hasMinimumPhotos(trail) {
        const photos = trail.photos || [];
        return photos.length >= this.validationRules.photos.minCount;
    }

    /**
     * Valida coordenada geográfica
     */
    isValidCoordinate(coord, type) {
        if (typeof coord !== 'number') return false;
        
        if (type === 'latitude') {
            return coord >= -90 && coord <= 90;
        } else if (type === 'longitude') {
            return coord >= -180 && coord <= 180;
        }
        
        return false;
    }

    /**
     * Simula upload de fotos com progresso
     */
    async uploadPhotos(files, trailId) {
        const startTime = Date.now();
        const uploadId = `upload_${trailId}_${startTime}`;
        
        this.uploadProgress.set(uploadId, {
            total: files.length,
            completed: 0,
            failed: 0,
            progress: 0,
            startTime,
            status: 'uploading'
        });

        const results = [];
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // Validar arquivo individual
                const validation = this.validateSinglePhoto({ file }, i);
                if (!validation.isValid) {
                    results.push({
                        index: i,
                        file: file.name,
                        success: false,
                        errors: validation.errors
                    });
                    this.updateUploadProgress(uploadId, 'failed');
                    continue;
                }

                // Simular upload
                const uploadResult = await this.simulatePhotoUpload(file, i);
                results.push(uploadResult);
                
                if (uploadResult.success) {
                    this.updateUploadProgress(uploadId, 'completed');
                } else {
                    this.updateUploadProgress(uploadId, 'failed');
                }
            }

            const totalTime = (Date.now() - startTime) / 1000;
            const progress = this.uploadProgress.get(uploadId);
            progress.status = 'completed';
            progress.totalTime = totalTime;

            // Verificar métrica de sucesso (10 imagens em 30s)
            if (files.length >= 10 && totalTime > 30) {
                if (window.trekkoRules) {
                    window.trekkoRules.logAudit('metric_violation', {
                        metric: 'upload_time_10_images',
                        expected: 30,
                        actual: totalTime,
                        fileCount: files.length
                    });
                }
            }

            return {
                uploadId,
                results,
                totalTime,
                successCount: results.filter(r => r.success).length,
                failureCount: results.filter(r => !r.success).length
            };

        } catch (error) {
            this.uploadProgress.get(uploadId).status = 'error';
            throw error;
        }
    }

    /**
     * Simula upload de uma foto
     */
    async simulatePhotoUpload(file, index) {
        // Simular tempo de upload baseado no tamanho do arquivo
        const uploadTime = Math.min(file.size / (1024 * 1024) * 1000, 5000); // Max 5s
        await new Promise(resolve => setTimeout(resolve, uploadTime));

        // Simular possível falha (2% chance)
        if (Math.random() < 0.02) {
            return {
                index,
                file: file.name,
                success: false,
                errors: ['Erro de rede durante upload']
            };
        }

        return {
            index,
            file: file.name,
            success: true,
            url: `https://cdn.trekko.com.br/trails/${Date.now()}_${index}.jpg`,
            size: file.size,
            uploadTime
        };
    }

    /**
     * Atualiza progresso do upload
     */
    updateUploadProgress(uploadId, type) {
        const progress = this.uploadProgress.get(uploadId);
        if (!progress) return;

        if (type === 'completed') {
            progress.completed++;
        } else if (type === 'failed') {
            progress.failed++;
        }

        progress.progress = ((progress.completed + progress.failed) / progress.total) * 100;
    }

    /**
     * Obtém progresso do upload
     */
    getUploadProgress(uploadId) {
        return this.uploadProgress.get(uploadId);
    }

    /**
     * Valida trilha em tempo real (para formulários)
     */
    validateRealTime(trail) {
        const validation = this.validateTrailForPublication(trail);
        
        // Retornar apenas erros críticos para não sobrecarregar a UI
        return {
            hasErrors: !validation.isValid,
            criticalErrors: validation.errors.filter(error => 
                error.includes('obrigatório') || 
                error.includes('Mínimo') ||
                error.includes('formato')
            ),
            canSave: validation.errors.length < 5, // Permitir salvar rascunho com alguns erros
            canPublish: validation.canPublish
        };
    }
}

// Instância global
window.TrailValidationSystem = TrailValidationSystem;
window.trailValidator = new TrailValidationSystem();

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrailValidationSystem;
}

