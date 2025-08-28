// Guard for undefined WordPress objects in standalone mode
if (typeof window.TingTongData === 'undefined') {
    console.warn('`TingTongData` is not defined. Using mock data for standalone development.');
    window.TingTongData = {
        isLoggedIn: false, // Start as logged out
        slides: [
            {
                'id': 'slide-001',
                'likeId': '1',
                'user': 'Paweł Polutek',
                'description': 'To jest dynamicznie załadowany opis dla pierwszego slajdu. Działa!',
                'mp4Url': 'https://pawelperfect.pl/wp-content/uploads/2025/07/17169505-hd_1080_1920_30fps.mp4',
                'hlsUrl': null,
                'poster': '',
                'avatar': 'https://i.pravatar.cc/100?u=pawel',
                'access': 'public',
                'initialLikes': 1500,
                'isLiked': false,
                'initialComments': 567
            },
            {
                'id': 'slide-002',
                'likeId': '2',
                'user': 'Web Dev',
                'description': 'Kolejny slajd, kolejne wideo. #efficiency',
                'mp4Url': 'https://pawelperfect.pl/wp-content/uploads/2025/07/4434150-hd_1080_1920_30fps-1.mp4',
                'hlsUrl': null,
                'poster': '',
                'avatar': 'https://i.pravatar.cc/100?u=webdev',
                'access': 'public',
                'initialLikes': 2200,
                'isLiked': false,
                'initialComments': 1245
            }
        ]
    };
}

export const slidesData = (typeof TingTongData !== 'undefined' && Array.isArray(TingTongData.slides)) ? TingTongData.slides : [];
slidesData.forEach(s => { s.likeId = String(s.likeId); });
