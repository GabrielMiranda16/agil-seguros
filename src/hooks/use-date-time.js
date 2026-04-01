import { useState, useEffect } from 'react';
import { format } from 'date-fns';

const useDateTime = () => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = format(currentDateTime, 'dd/MM/yyyy');
  const formattedTime = format(currentDateTime, 'HH:mm:ss');

  return { formattedDate, formattedTime, zonedTime: currentDateTime };
};

export default useDateTime;