import { createTranslator } from '../i18n.mjs';

const strings = {
    en: {
        'nav.github': 'GitHub',
        'footer.builtByPrefix': 'Built by the',
        'footer.builtBySuffix': 'community.',
        'footer.contribute': 'Want to improve this site?',
        'footer.contributeLink': 'Contributions welcome',
    },
    fr: {
        'nav.github': 'GitHub',
        'footer.builtByPrefix': 'Créé par la communauté',
        'footer.builtBySuffix': '.',
        'footer.contribute': "Envie d'améliorer ce site ?",
        'footer.contributeLink': 'Contributions bienvenues',
    },
};

export const tLayout = createTranslator(strings);
