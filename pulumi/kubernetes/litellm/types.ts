import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export interface LiteLLMProxyConfig {
    namespace: k8s.core.v1.Namespace;
    postgresServiceName: string;
    domain: string;
    tunnelToken: pulumi.Output<string>;
    apiKeys: {
        openrouter: string;
        nanogpt: string;
        glm: string;
    };
}

export interface LiteLLMProxyOutputs {
    deployment: k8s.apps.v1.Deployment;
    service: k8s.core.v1.Service;
    secret: k8s.core.v1.Secret;
    configMap: k8s.core.v1.ConfigMap;
    tunnelDeployment: k8s.apps.v1.Deployment;
}

export interface LiteLLMPostgresConfig {
    namespace: k8s.core.v1.Namespace;
}

export interface LiteLLMPostgresOutputs {
    deployment: k8s.apps.v1.Deployment;
    service: k8s.core.v1.Service;
    secret: k8s.core.v1.Secret;
    pvc: k8s.core.v1.PersistentVolumeClaim;
    serviceName: string;
}
