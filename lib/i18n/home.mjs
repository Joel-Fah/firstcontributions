import { createTranslator } from '../i18n.mjs';

const strings = {
    en: {
        'hero.title': 'Your first open source contribution starts here',
        'hero.lede':
            'Everyone on this page joined by adding a small file to our repository. It takes about five minutes, you only need a GitHub account, and there is nothing to install.',
        'hero.formLabel': 'Your GitHub username',
        'hero.formPlaceholder': 'e.g. octocat',
        'hero.formButton': 'Add me →',
        'hero.formHint': 'Opens GitHub with your file ready to fill in.',
        'hero.howLink': 'How it works',
        'stats.contributors': 'Contributors',
        'stats.issuesAndPrs': 'Issues & PRs listed',
        'stats.mergedPrs': 'Merged PRs',
        'toolbar.heading': 'Contributors',
        'toolbar.searchPlaceholder': 'Search by name, username or city',
        'toolbar.searchAriaLabel': 'Search contributors',
        'grid.empty': 'Nobody matches that search.',
        'card.contribution.one': '{count} contribution',
        'card.contribution.other': '{count} contributions',
        'how.heading': 'How to add yourself',
        'how.step1':
            '<strong>Enter your username above</strong> and click <em>Add me</em>. GitHub opens an editor with your file, <code>contributors/your-username.yml</code>.',
        'how.step2':
            "<strong>Fill in your name</strong> and, if you like, a short bio, your city and a website. Delete any line you don't want.",
        'how.step3':
            '<strong>Click <em>Commit changes…</em>, then <em>Propose changes</em>.</strong> GitHub makes your own copy of the project (a <em>fork</em>) for you.',
        'how.step4':
            '<strong>Click <em>Create pull request</em>.</strong> A bot checks your file within a minute and tells you if anything needs fixing.',
        'how.closing':
            'Once your pull request is merged, you appear here. Later, edit your file to list the issues and pull requests you work on in any open source project, and they show up on your profile.',
        'meta.description': '{count} people who made their first open source contribution with {community}.',
    },
    fr: {
        'hero.title': 'Votre première contribution open source commence ici',
        'hero.lede':
            'Toutes les personnes de cette page ont rejoint en ajoutant un petit fichier à notre dépôt. Cela prend environ cinq minutes, il vous faut seulement un compte GitHub, et rien à installer.',
        'hero.formLabel': "Votre nom d'utilisateur GitHub",
        'hero.formPlaceholder': 'ex. octocat',
        'hero.formButton': "M'ajouter →",
        'hero.formHint': 'Ouvre GitHub avec votre fichier prêt à remplir.',
        'hero.howLink': 'Comment ça marche',
        'stats.contributors': 'Contributeurs',
        'stats.issuesAndPrs': 'Issues et PR listées',
        'stats.mergedPrs': 'PR fusionnées',
        'toolbar.heading': 'Contributeurs',
        'toolbar.searchPlaceholder': 'Rechercher par nom, utilisateur ou ville',
        'toolbar.searchAriaLabel': 'Rechercher des contributeurs',
        'grid.empty': 'Aucun résultat pour cette recherche.',
        'card.contribution.one': '{count} contribution',
        'card.contribution.other': '{count} contributions',
        'how.heading': 'Comment vous ajouter',
        'how.step1':
            "<strong>Entrez votre nom d'utilisateur ci-dessus</strong> et cliquez sur <em>M'ajouter</em>. GitHub ouvre un éditeur avec votre fichier, <code>contributors/votre-nom-utilisateur.yml</code>.",
        'how.step2':
            "<strong>Renseignez votre nom</strong> et, si vous le souhaitez, une courte bio, votre ville et un site web. Supprimez les lignes que vous ne voulez pas.",
        'how.step3':
            '<strong>Cliquez sur <em>Commit changes…</em>, puis sur <em>Propose changes</em>.</strong> GitHub crée votre propre copie du projet (un <em>fork</em>).',
        'how.step4':
            '<strong>Cliquez sur <em>Create pull request</em>.</strong> Un bot vérifie votre fichier en moins d\'une minute et vous indique si quelque chose doit être corrigé.',
        'how.closing':
            "Une fois votre pull request fusionnée, vous apparaissez ici. Plus tard, modifiez votre fichier pour lister les issues et pull requests sur lesquelles vous travaillez dans n'importe quel projet open source, et elles apparaîtront sur votre profil.",
        'meta.description': '{count} personnes ayant fait leur première contribution open source avec {community}.',
    },
};

export const tHome = createTranslator(strings);
