document.addEventListener('DOMContentLoaded', () => {
    // 1. Language Toggle Logic
    const langToggle = document.getElementById('lang-toggle');
    let currentLang = localStorage.getItem('voyage_lang') || 'zh';
    
    // Set initial language class
    document.body.classList.remove('lang-zh', 'lang-en');
    document.body.classList.add(`lang-${currentLang}`);
    updateJournalTitle(currentLang);

    function updateJournalTitle(lang) {
        if (lang === 'en') {
            document.title = "STEVEN ZHANG | Thought Fragments";
        } else {
            document.title = "STEVEN ZHANG | 思维碎片";
        }
    }

    if (langToggle) {
        langToggle.addEventListener('click', (e) => {
            e.preventDefault();
            let newLang = document.body.classList.contains('lang-zh') ? 'en' : 'zh';
            document.body.classList.remove('lang-zh', 'lang-en');
            document.body.classList.add(`lang-${newLang}`);
            localStorage.setItem('voyage_lang', newLang);
            updateJournalTitle(newLang);
        });
    }

    // 2. Interactive Sidebar Filters
    const filterGroups = document.querySelectorAll('.filter-group');
    filterGroups.forEach(group => {
        const items = group.querySelectorAll('ul.filter-list li:not(.filter-empty)');
        items.forEach(item => {
            item.addEventListener('click', () => {
                // Remove active class from siblings
                items.forEach(sib => sib.classList.remove('active'));
                // Add active class to clicked item
                item.classList.add('active');
            });
        });
    });

    // 3. Prevent Flash of Unstyled Text (FOUT)
    if (document.fonts) {
        document.fonts.ready.then(() => {
            document.body.classList.add('fonts-loaded');
        });
        setTimeout(() => {
            document.body.classList.add('fonts-loaded');
        }, 1000);
    } else {
        document.body.classList.add('fonts-loaded');
    }

    // 4. Anti-Save Protections (Matches Main Site)
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('dragstart', event => {
        if (event.target.tagName.toLowerCase() === 'img') {
            event.preventDefault();
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'F12' || 
           (event.ctrlKey && event.shiftKey && event.key === 'I') || 
           (event.ctrlKey && event.key === 'u')) {
            event.preventDefault();
        }
    });
});
