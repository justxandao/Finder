import { useEffect } from 'react';

export default function useDraggable(elementId) {
    useEffect(() => {
        const el = document.getElementById(elementId);
        if (!el) return;
        const handle = el.querySelector('.drag-handle');
        if (!handle) return;

        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const onMouseDown = (e) => {
            if (e.button !== 0) return; // Only left click
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // Get current computed style
            const style = window.getComputedStyle(el);
            initialLeft = parseInt(style.left, 10) || el.offsetLeft;
            initialTop = parseInt(style.top, 10) || el.offsetTop;

            // Fix right/bottom constraints to allow left/top dragging smoothly
            if (style.right !== 'auto') {
                el.style.right = 'auto';
            }
            if (style.bottom !== 'auto') {
                el.style.bottom = 'auto';
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            el.style.left = `${initialLeft + dx}px`;
            el.style.top = `${initialTop + dy}px`;
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        handle.addEventListener('mousedown', onMouseDown);

        return () => {
            handle.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [elementId]);
}
