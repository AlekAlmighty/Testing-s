document.addEventListener('DOMContentLoaded', function() {
    const emergencyButton = document.getElementById('emergency-call-button');

    emergencyButton.addEventListener('click', function() {
        window.location.href = 'tel:911';
    });
});