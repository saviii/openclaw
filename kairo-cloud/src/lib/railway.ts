const RAILWAY_API = "https://backboard.railway.com/graphql/v2";

async function railwayQuery<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const token = process.env.RAILWAY_API_TOKEN;
  if (!token) {
    throw new Error("RAILWAY_API_TOKEN not set");
  }

  const res = await fetch(RAILWAY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Railway API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };
  if (json.errors?.length) {
    throw new Error(`Railway GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`);
  }
  return json.data as T;
}

export async function createService(name: string): Promise<string> {
  const projectId = process.env.RAILWAY_PROJECT_ID;
  const image = process.env.KAIRO_DOCKER_IMAGE;
  if (!projectId || !image) {
    throw new Error("RAILWAY_PROJECT_ID and KAIRO_DOCKER_IMAGE must be set");
  }

  const data = await railwayQuery<{
    serviceCreate: { id: string };
  }>(
    `mutation($input: ServiceCreateInput!) {
      serviceCreate(input: $input) { id }
    }`,
    {
      input: {
        projectId,
        name,
        source: { image },
      },
    },
  );
  return data.serviceCreate.id;
}

export async function setServiceVariables(
  serviceId: string,
  variables: Record<string, string>,
): Promise<void> {
  const projectId = process.env.RAILWAY_PROJECT_ID;
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;
  if (!projectId || !environmentId) {
    throw new Error("RAILWAY_PROJECT_ID and RAILWAY_ENVIRONMENT_ID must be set");
  }

  await railwayQuery(
    `mutation($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }`,
    {
      input: {
        projectId,
        environmentId,
        serviceId,
        variables,
        replace: true,
      },
    },
  );
}

export async function createServiceDomain(serviceId: string): Promise<string> {
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;
  if (!environmentId) {
    throw new Error("RAILWAY_ENVIRONMENT_ID must be set");
  }

  const data = await railwayQuery<{
    serviceDomainCreate: { domain: string };
  }>(
    `mutation($input: ServiceDomainCreateInput!) {
      serviceDomainCreate(input: $input) { domain }
    }`,
    {
      input: {
        serviceId,
        environmentId,
        targetPort: 3000,
      },
    },
  );
  return data.serviceDomainCreate.domain;
}

export async function deleteService(serviceId: string): Promise<void> {
  await railwayQuery(
    `mutation($id: String!) {
      serviceDelete(id: $id)
    }`,
    { id: serviceId },
  );
}
