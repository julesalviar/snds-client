export interface Report {
  _id?: string;
  title: string;
  reportTemplateId?: ReportTemplate;
  reportQueryId: string;
}

export interface ReportTemplate {
  _id: string;
  title: string;
  reportType: string;
  paperSize: string;
  orientation: string;
  parameters: ReportTemplateParameter[];
  table: ReportTemplateTable;
}

export interface ReportTemplateParameter {
  name: string;
  type: string;
  label: string;
  value: string[];
}

export interface ReportTemplateTable {
  columns?: ReportTemplateTableColumns[];
}

export interface ReportTemplateTableColumns {
  header: string;
  field: string;
}
