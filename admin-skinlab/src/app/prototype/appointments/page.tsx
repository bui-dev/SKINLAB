import { getTranslations } from "next-intl/server";

import { createA0Fixtures } from "@/features/appointment-prototype/model/fixtures";

export default async function AppointmentPrototypePage() {
  const t = await getTranslations("AppointmentPrototype");
  const fixtures = createA0Fixtures();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 p-6">
      <div
        role="alert"
        className="rounded-lg border border-amber-600 bg-amber-50 px-4 py-3 font-semibold text-amber-950"
      >
        {t("warning")}
      </div>

      <section aria-labelledby="prototype-title" className="space-y-4">
        <div>
          <h1 id="prototype-title" className="text-2xl font-semibold">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <dt className="text-sm text-muted-foreground">{t("doctors")}</dt>
            <dd className="text-3xl font-semibold">
              {fixtures.doctors.length}
            </dd>
          </div>
          <div className="rounded-lg border p-4">
            <dt className="text-sm text-muted-foreground">
              {t("appointments")}
            </dt>
            <dd className="text-3xl font-semibold">
              {fixtures.appointments.length}
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
