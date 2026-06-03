import React from 'react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PageHeader = ({ title, description, actions, badge, className, showBack, onBack }) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack) onBack();
        else navigate(-1);
    };

    return (
        <div className={cn("ds-page-header", className)}>
            <div className="ds-page-title-group">
                <div className="flex items-center gap-3">
                    {showBack && (
                        <button 
                            onClick={handleBack}
                            className="p-1.5 -ml-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    )}
                    <div className="flex items-center gap-2">
                        <h1 className="ds-h1">{title}</h1>
                        {badge && badge}
                    </div>
                </div>
                {description && <p className={cn("ds-description", showBack && "ml-9")}>{description}</p>}
            </div>
            {actions && <div className="ds-page-actions">{actions}</div>}
        </div>
    );
};

export default PageHeader;
