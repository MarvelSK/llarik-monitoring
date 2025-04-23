
/**
 * Provides a human-readable explanation of a CRON expression
 */
export function explainCronExpression(cronExpression: string): string {
  try {
    // Handle the most common CRON patterns
    if (cronExpression === "* * * * *") {
      return "Každú minútu";
    }
    
    // Handling */N pattern (every N minutes)
    if (cronExpression.match(/^\*\/(\d+) \* \* \* \*$/)) {
      const minutes = cronExpression.match(/^\*\/(\d+) \* \* \* \*$/)?.[1];
      return `Každých ${minutes} minút`;
    }
    
    // Handling specific minute every hour
    if (cronExpression.match(/^(\d+) \* \* \* \*$/)) {
      const minute = cronExpression.match(/^(\d+) \* \* \* \*$/)?.[1];
      return `V ${minute}. minúte každej hodiny`;
    }
    
    // Handling specific hour and minute every day
    if (cronExpression.match(/^(\d+) (\d+) \* \* \*$/)) {
      const matches = cronExpression.match(/^(\d+) (\d+) \* \* \*$/);
      const minute = matches?.[1];
      const hour = matches?.[2];
      return `Každý deň o ${hour}:${minute.padStart(2, '0')}`;
    }
    
    // Handling specific day of week
    const daysOfWeek = ['Nedeľu', 'Pondelok', 'Utorok', 'Stredu', 'Štvrtok', 'Piatok', 'Sobotu'];
    if (cronExpression.match(/^(\d+) (\d+) \* \* (\d+)$/)) {
      const matches = cronExpression.match(/^(\d+) (\d+) \* \* (\d+)$/);
      const minute = matches?.[1];
      const hour = matches?.[2];
      const dayOfWeek = parseInt(matches?.[3] || "0");
      return `Každý ${daysOfWeek[dayOfWeek]} o ${hour}:${minute.padStart(2, '0')}`;
    }
    
    // Fallback for complex expressions
    return "Komplexný časový plán"; 
  } catch (error) {
    console.error("Error parsing cron expression:", error);
    return "Vlastný časový plán";
  }
}
