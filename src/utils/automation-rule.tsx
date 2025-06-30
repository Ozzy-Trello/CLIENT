export const renderType = (type: string, condition: any): string => {
  
  // Replace the placeholders
  let result = type
    .replace(/-/g, ' ')
    .replace(/<action>/, condition?.action?.label || condition?.action || '')
    .replace(/<optional_action>/, condition?.optional_action?.label || condition?.optional_action || '')
    .replace(/<by>/, condition?.by?.label || condition?.by || '')
    .replace(/<optional_by>/, condition?.optional_by?.label || condition?.optional_by || '')
    .replace(/<board>/, condition?.board?.label || condition?.board || '')
    .replace(/<optional_board>/, condition?.optional_board?.label || condition?.optional_board || '')
    .replace(/<list>/, condition?.list?.value?.label || condition?.list?.label || condition?.list || '')
    .replace(/<optional_list>/, condition?.optional_list?.value?.label || condition?.optional_list?.label || condition?.optional_list || '')
    .replace(/<position>/, condition?.position?.label || condition?.position || '')
    .replace(/<optional_position>/, condition?.optional_position?.label || condition?.optional_position || '')
    .replace(/<filter>/, '') // remove placeholder
    .replace(/<text_input>/, condition?.text_input?.value || condition?.text_input || '')
    .replace(/<channel>/, condition?.channel?.label || condition?.channel || '')
    .replace(/<user>/, condition?.user?.username || condition?.user || '')
    .replace(/<inclusion>/, condition?.inclusion?.value?.label || condition?.inclusion?.label || condition?.inclusion || '')
    .replace(/<card_label>/, condition?.label?.value?.label || condition?.label?.label || condition?.assignment || '')
    .replace(/<assignment>/, condition?.assignment?.value?.label || condition?.assignment?.label || condition?.assignment || '')
    .replace(/<assignment_subject>/, condition?.assignment_subject?.value?.label || condition?.assignment_subject?.label || condition?.assignment_subject || '')
    .replace(/<date_status>/, condition?.date_status?.value?.label || condition?.date_status?.label || condition?.date_status || '')
    .replace(/<time_range>/, condition?.time_range?.value?.label || condition?.time_range?.label || condition?.time_range || '')
    .replace(/<time_comparison>/, condition?.time_comparison?.value?.label || condition?.time_comparison?.label || condition?.time_comparison || '')
    .replace(/<time_unit>/, condition?.time_unit?.value?.label || condition?.time_unit?.label || condition?.time_unit || '')
    .replace(/\[number\]/, condition?.number || '')
    .replace(/\s+/g, ' ') // clean extra spaces (fixed regex)
    .trim();
  
  return result;
}