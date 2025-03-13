
import React from "react";
import Layout from "@/components/layout/Layout";
import FileImport from "@/components/import/FileImport";

const Import = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hromadný import</h1>
          <p className="text-muted-foreground">
            Importujte projekty alebo kontroly z JSON súborov
          </p>
        </div>
        <FileImport />
      </div>
    </Layout>
  );
};

export default Import;
