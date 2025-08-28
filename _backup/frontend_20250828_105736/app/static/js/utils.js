let projectSlug = '';

export function getProjectSlug() {
    const path = window.location.pathname;
    const parts = path.split('/');
    if (parts.length > 1 && parts[1] !== '') {
        return parts[1];
    }
    return null;
}

export function getApiUrl(endpoint) {
    if (projectSlug) {
        return `/${projectSlug}${endpoint}`;
    }
    return endpoint;
}

export function setProjectSlug(slug) {
    projectSlug = slug;
}