import React, { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';


const CountUp = ({ target, prefix = '', duration = 1000 }) => {
    const [count, setCount] = useState(0);
    const countRef = useRef(null);

    useEffect(() => {
        let start = 0;
        const end = parseInt(target, 10);
        if (isNaN(end)) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            setCount(Math.floor(progress * (end - start) + start));
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }, [target, duration]);

    return <span ref={countRef}>{prefix}{count.toLocaleString()}</span>;
};
export default CountUp;