/**
 * Centralized networking configuration for all Kubernetes services.
 * Define ClusterIPs here to avoid repetition across deployments.
 */

// All service ClusterIP definitions in one place
export const serviceIPs = {
    aiometadata: "10.43.200.200",
    jackett: "10.43.200.201",
    byparr: "10.43.200.202",
    monitoring: "10.43.200.203",
    syncthing: "10.43.200.204",
    "syncthing-relay": "10.43.200.205",
    "syncthing-discovery": "10.43.200.206",
    openclaw: "10.43.200.207",
    // Add new services here as needed
} as const;

export type ServiceName = keyof typeof serviceIPs;
/**
 * Generate hostAliases for a Pod spec from a list of service names.
 * @example hostAliases: getHostAliases(["aiometadata", "jackett"])
 */
export function getHostAliases(services: ServiceName[]) {
    return services.map((name) => ({
        ip: serviceIPs[name],
        hostnames: [name],
    }));
}

/**
 * Get the ClusterIP for a specific service.
 * @example clusterIP: getServiceIP("aiometadata")
 */
export function getServiceIP(service: ServiceName): string {
    return serviceIPs[service];
}
