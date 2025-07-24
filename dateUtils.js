export const getUniversalTime = () => {
    const now = new Date();
    const options = { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' };
  
    // Format Date in Pacific Time (YYYY-MM-DD)
    const formattedDate = new Intl.DateTimeFormat('en-CA', options).format(now);
  
    return {
      fullDate: formattedDate, // YYYY-MM-DD format for AsyncStorage
      rawDate: now, // Raw Date object if needed
    };
  };