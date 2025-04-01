import React, { useEffect } from 'react';
import axios from 'axios';

const ALLOWED_IP = '195.12.137.16';  // Replace with the specific allowed IP address.

interface IPCheckComponentProps {
    onAuthorized: (authorized: boolean) => void; // Callback to inform parent about authorization status
}

const IPCheckComponent: React.FC<IPCheckComponentProps> = ({ onAuthorized }) => {
    useEffect(() => {
        // Fetch the user's IP address from ipinfo.io API
        axios.get('https://ipinfo.io/json?token=14cac399fd3a49') // Replace 'YOUR_TOKEN' with your API token from ipinfo.io
            .then(response => {
                const userIP = response.data.ip;
                if (userIP === ALLOWED_IP) {
                    onAuthorized(true);  // User is authorized
                } else {
                    onAuthorized(false); // User is not authorized
                }
            })
            .catch(() => {
                onAuthorized(false); // In case of error (e.g., network issues, API limit)
            });
    }, [onAuthorized]);

    return null; // Do not render anything itself
};

export default IPCheckComponent;
