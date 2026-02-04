import { useMemo } from "react";
import { Calendar, Timer } from "react-coolicons";

/**
 * Format a date for display
 * @param {Date|Object|string} date - Date to format
 * @returns {Date|null}
 */
const parseDate = (date) => {
    if (!date) return null;
    
    // Handle Firestore Timestamp
    if (date.toDate && typeof date.toDate === "function") {
        return date.toDate();
    }
    
    // Handle seconds (Firestore Timestamp format)
    if (date.seconds) {
        return new Date(date.seconds * 1000);
    }
    
    // Handle ISO string or Date object
    return new Date(date);
};

/**
 * Component to display scheduled order information prominently
 * Shows countdown and scheduled date/time for iFood scheduled orders
 * 
 * @param {Object} props
 * @param {boolean} props.isScheduled - Whether the order is scheduled
 * @param {Date|Object|string} props.scheduledFor - Scheduled delivery date/time
 * @param {Date|Object|string} props.scheduledForEnd - Scheduled delivery end time (optional)
 * @param {Object} props.schedule - Full schedule object from iFood
 * @param {string} props.orderTiming - Order timing (IMMEDIATE or SCHEDULED)
 * @param {string} props.variant - Display variant: "badge" | "card" | "inline" (default: "card")
 */
const IfoodScheduledBadge = ({
    isScheduled,
    scheduledFor,
    scheduledForEnd,
    schedule,
    orderTiming,
    variant = "card",
}) => {
    // Check if order is scheduled
    const isScheduledOrder = isScheduled || orderTiming === "SCHEDULED";
    
    // Parse scheduled date
    const scheduledDate = useMemo(() => {
        if (scheduledFor) return parseDate(scheduledFor);
        if (schedule?.deliveryDateTimeStart) return parseDate(schedule.deliveryDateTimeStart);
        return null;
    }, [scheduledFor, schedule]);
    
    const scheduledEndDate = useMemo(() => {
        if (scheduledForEnd) return parseDate(scheduledForEnd);
        if (schedule?.deliveryDateTimeEnd) return parseDate(schedule.deliveryDateTimeEnd);
        return null;
    }, [scheduledForEnd, schedule]);
    
    // Calculate time remaining
    const timeInfo = useMemo(() => {
        if (!scheduledDate) return null;
        
        const now = new Date();
        const diffMs = scheduledDate.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        const isPast = diffMs < 0;
        
        let timeText = "";
        if (isPast) {
            if (Math.abs(diffMins) < 60) {
                timeText = `Há ${Math.abs(diffMins)} min`;
            } else if (Math.abs(diffHours) < 24) {
                timeText = `Há ${Math.abs(diffHours)}h`;
            } else {
                timeText = `Há ${Math.abs(diffDays)} dia(s)`;
            }
        } else {
            if (diffMins < 60) {
                timeText = `Em ${diffMins} min`;
            } else if (diffHours < 24) {
                const remainingMins = diffMins % 60;
                timeText = remainingMins > 0 
                    ? `Em ${diffHours}h ${remainingMins}min` 
                    : `Em ${diffHours}h`;
            } else {
                timeText = `Em ${diffDays} dia(s)`;
            }
        }
        
        return {
            isPast,
            isUrgent: !isPast && diffMins <= 30,
            isApproaching: !isPast && diffMins <= 60,
            timeText,
            diffMins,
        };
    }, [scheduledDate]);
    
    // Format date for display
    const formattedDate = useMemo(() => {
        if (!scheduledDate) return null;
        
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const isToday = scheduledDate.toDateString() === today.toDateString();
        const isTomorrow = scheduledDate.toDateString() === tomorrow.toDateString();
        
        const timeStr = scheduledDate.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        });
        
        if (isToday) {
            return `Hoje às ${timeStr}`;
        } else if (isTomorrow) {
            return `Amanhã às ${timeStr}`;
        } else {
            return scheduledDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        }
    }, [scheduledDate]);
    
    // Format time range
    const timeRange = useMemo(() => {
        if (!scheduledDate) return null;
        
        const startTime = scheduledDate.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        });
        
        if (scheduledEndDate) {
            const endTime = scheduledEndDate.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
            });
            return `${startTime} - ${endTime}`;
        }
        
        return startTime;
    }, [scheduledDate, scheduledEndDate]);
    
    // Don't render if not a scheduled order
    if (!isScheduledOrder) return null;
    
    // Determine color based on urgency
    const getColorScheme = () => {
        if (!timeInfo) return { bg: "blue", text: "blue" };
        if (timeInfo.isPast) return { bg: "red", text: "red" };
        if (timeInfo.isUrgent) return { bg: "orange", text: "orange" };
        if (timeInfo.isApproaching) return { bg: "yellow", text: "yellow" };
        return { bg: "blue", text: "blue" };
    };
    
    const colors = getColorScheme();
    
    // Badge variant - compact inline display
    if (variant === "badge") {
        return (
            <span
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full
                    ${timeInfo?.isPast ? 'bg-red-100 text-red-800' : ''}
                    ${timeInfo?.isUrgent ? 'bg-orange-100 text-orange-800' : ''}
                    ${timeInfo?.isApproaching && !timeInfo?.isUrgent ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${!timeInfo?.isPast && !timeInfo?.isUrgent && !timeInfo?.isApproaching ? 'bg-blue-100 text-blue-800' : ''}
                `}
            >
                <Calendar className="w-3 h-3" />
                <span>Agendado</span>
                {timeInfo && <span className="font-bold">• {timeInfo.timeText}</span>}
            </span>
        );
    }
    
    // Inline variant - simple inline display
    if (variant === "inline") {
        return (
            <div className="flex items-center gap-2 text-sm">
                <Calendar className={`w-4 h-4 text-${colors.text}-600`} />
                <span className="font-medium">
                    📅 Agendado: {formattedDate || "Data não informada"}
                </span>
                {timeInfo && (
                    <span className={`font-bold ${
                        timeInfo.isPast ? 'text-red-600' :
                        timeInfo.isUrgent ? 'text-orange-600' :
                        timeInfo.isApproaching ? 'text-yellow-600' :
                        'text-blue-600'
                    }`}>
                        ({timeInfo.timeText})
                    </span>
                )}
            </div>
        );
    }
    
    // Card variant (default) - prominent card display
    return (
        <div 
            className={`rounded-lg p-4 border-2 ${
                timeInfo?.isPast ? 'bg-red-50 border-red-300' :
                timeInfo?.isUrgent ? 'bg-orange-50 border-orange-300 animate-pulse' :
                timeInfo?.isApproaching ? 'bg-yellow-50 border-yellow-300' :
                'bg-blue-50 border-blue-300'
            }`}
        >
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${
                    timeInfo?.isPast ? 'bg-red-100' :
                    timeInfo?.isUrgent ? 'bg-orange-100' :
                    timeInfo?.isApproaching ? 'bg-yellow-100' :
                    'bg-blue-100'
                }`}>
                    <Calendar className={`w-6 h-6 ${
                        timeInfo?.isPast ? 'text-red-600' :
                        timeInfo?.isUrgent ? 'text-orange-600' :
                        timeInfo?.isApproaching ? 'text-yellow-600' :
                        'text-blue-600'
                    }`} />
                </div>
                
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-bold text-lg ${
                            timeInfo?.isPast ? 'text-red-800' :
                            timeInfo?.isUrgent ? 'text-orange-800' :
                            timeInfo?.isApproaching ? 'text-yellow-800' :
                            'text-blue-800'
                        }`}>
                            📅 PEDIDO AGENDADO
                        </h4>
                        {timeInfo?.isUrgent && !timeInfo?.isPast && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-orange-500 text-white rounded-full animate-bounce">
                                URGENTE!
                            </span>
                        )}
                    </div>
                    
                    <div className="space-y-1">
                        <p className={`text-base font-medium ${
                            timeInfo?.isPast ? 'text-red-700' :
                            timeInfo?.isUrgent ? 'text-orange-700' :
                            timeInfo?.isApproaching ? 'text-yellow-700' :
                            'text-blue-700'
                        }`}>
                            {formattedDate || "Data/hora não informada"}
                        </p>
                        
                        {timeRange && scheduledEndDate && (
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Timer className="w-4 h-4" />
                                Janela de entrega: {timeRange}
                            </p>
                        )}
                        
                        {timeInfo && (
                            <p className={`text-sm font-bold ${
                                timeInfo.isPast ? 'text-red-600' :
                                timeInfo.isUrgent ? 'text-orange-600' :
                                timeInfo.isApproaching ? 'text-yellow-600' :
                                'text-blue-600'
                            }`}>
                                {timeInfo.isPast 
                                    ? `⚠️ Atrasado! Era para ${timeInfo.timeText.toLowerCase()}`
                                    : `⏱️ ${timeInfo.timeText}`
                                }
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IfoodScheduledBadge;
