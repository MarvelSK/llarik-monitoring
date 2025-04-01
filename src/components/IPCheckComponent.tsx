import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ALLOWED_IP = '195.12.137.16';

const IPCheckComponent: React.FC = () => {
    const [accessGranted, setAccessGranted] = useState<boolean | null>(null);

    useEffect(() => {
        axios.get('https://ipinfo.io/json?token=14cac399fd3a49')
            .then(response => {
                const userIP = response.data.ip;
                if (userIP === ALLOWED_IP) {
                    setAccessGranted(true);
                } else {
                    setAccessGranted(false);
                }
            })
            .catch(() => {
                setAccessGranted(false);
            });
    }, []);

    if (accessGranted === null) {
        return <div>Načítavam...</div>;
    }

    if (accessGranted === false) {
        return <div>Prístup zamietnutý</div>;
    }

    return <div>Vítajte</div>;
};

export default IPCheckComponent;