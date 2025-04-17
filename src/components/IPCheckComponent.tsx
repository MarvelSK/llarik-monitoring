
import React, { useEffect } from 'react';
import axios from 'axios';

const ALLOWED_IP = '195.12.137.16';  // Explicitly defined allowed IP

interface IPCheckComponentProps {
    onAuthorized: (authorized: boolean) => void;
}

const IPCheckComponent: React.FC<IPCheckComponentProps> = ({ onAuthorized }) => {
    useEffect(() => {
        axios.get('https://ipinfo.io/json?token=14cac399fd3a49')
            .then(response => {
                const userIP = response.data.ip;
                console.log('Current IP:', userIP); // Log the IP for debugging
                
                // Strict check for the exact IP address
                if (userIP === ALLOWED_IP) {
                    onAuthorized(true);  // User is authorized
                } else {
                    onAuthorized(false); // User is not authorized
                    console.warn(`Unauthorized access attempt from IP: ${userIP}`);
                }
            })
            .catch((error) => {
                console.error('IP check failed:', error);
                onAuthorized(false); // In case of error (e.g., network issues, API limit)
            });
    }, [onAuthorized]);

    return null; // Do not render anything itself
};

export default IPCheckComponent;
