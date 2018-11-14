export function getTablesQuery(maxTableCount: number): string {
  if (maxTableCount !== 0) {
    return `SELECT FIRST ${Math.abs(maxTableCount)} RDB$RELATION_NAME TABLE_NAME
              FROM RDB$RELATIONS
             WHERE RDB$SYSTEM_FLAG = 0 
               AND RDB$RELATION_TYPE = 0 
          ORDER BY 1;`;
  } else {
    return `SELECT RDB$RELATION_NAME TABLE_NAME
              FROM RDB$RELATIONS
             WHERE RDB$SYSTEM_FLAG = 0 
               AND RDB$RELATION_TYPE = 0 
          ORDER BY 1;`;
  }
}

export function tableInfoQuery(tableName: string): string {
  return ` 
  SELECT TRIM(r.RDB$FIELD_NAME) AS FIELD_NAME,
         CASE f.RDB$FIELD_TYPE
           WHEN 261 THEN 'BLOB'
           WHEN 14  THEN 'CHAR'
           WHEN 40  THEN 'CSTRING'
           WHEN 11  THEN 'D_FLOAT'
           WHEN 27  THEN 'DOUBLE'
           WHEN 10  THEN 'FLOAT'
           WHEN 16  THEN 'INT64'
           WHEN 8   THEN 'INTEGER'
           WHEN 9   THEN 'QUAD'
           WHEN 7   THEN 'SMALLINT'
           WHEN 12  THEN 'DATE'
           WHEN 13  THEN 'TIME'
           WHEN 35  THEN 'TIMESTAMP'
           WHEN 37  THEN 'VARCHAR'
           ELSE 'UNKNOWN'
         END AS FIELD_TYPE,
            f.RDB$FIELD_LENGTH AS FIELD_LENGTH,
            f.RDB$FIELD_PRECISION AS FIELD_PRECISION,
            f.RDB$FIELD_SCALE AS FIELD_SCALE,
            MIN(rc.RDB$CONSTRAINT_TYPE) AS CONSTRAINT_TYPE,
            MIN(i.RDB$INDEX_NAME) AS INDEX_NAME,
            CASE WHEN r.RDB$NULL_FLAG = 1 THEN 1 ELSE 0 END AS NOT_NULL,
            cast(r.RDB$DEFAULT_SOURCE as varchar(100) character set utf8) AS DFLT_VALUE,
            r.RDB$FIELD_POSITION AS FIELD_POSITION 
       FROM RDB$RELATION_FIELDS r
  LEFT JOIN RDB$FIELDS f ON r.RDB$FIELD_SOURCE = f.RDB$FIELD_NAME
  LEFT JOIN RDB$INDEX_SEGMENTS s ON s.RDB$FIELD_NAME=r.RDB$FIELD_NAME
  LEFT JOIN RDB$INDICES i ON i.RDB$INDEX_NAME = s.RDB$INDEX_NAME 
        AND i.RDB$RELATION_NAME=r.RDB$RELATION_NAME
  LEFT JOIN RDB$RELATION_CONSTRAINTS rc ON rc.RDB$INDEX_NAME = s.RDB$INDEX_NAME
        AND rc.RDB$INDEX_NAME = i.RDB$INDEX_NAME
        AND rc.RDB$RELATION_NAME = i.RDB$RELATION_NAME
  LEFT JOIN RDB$REF_CONSTRAINTS refc ON rc.RDB$CONSTRAINT_NAME = refc.RDB$CONSTRAINT_NAME
      WHERE (r.rdb$system_flag is null or r.rdb$system_flag = 0) AND r.RDB$RELATION_NAME ='${tableName}'
   GROUP BY FIELD_NAME, FIELD_TYPE, FIELD_LENGTH, FIELD_PRECISION, FIELD_SCALE, NOT_NULL, DFLT_VALUE, FIELD_POSITION 
   ORDER BY FIELD_POSITION;`;
}

export function fieldsQuery(tables: string[]): string {
  let string = tables.join("','");
  return ` 
SELECT TRIM(r.RDB$FIELD_NAME) AS Field,
       TRIM(r.RDB$RELATION_NAME) AS Tbl,
  CASE WHEN r.RDB$NULL_FLAG = 1 THEN '1' ELSE '0' END AS NOTNULL,
            r.RDB$DEFAULT_VALUE AS DFLT_VALUE,
            r.RDB$FIELD_POSITION AS Pos 
       FROM RDB$RELATION_FIELDS r
      WHERE (r.rdb$system_flag IS NULL OR r.rdb$system_flag = 0) 
        AND r.RDB$RELATION_NAME IN ('${string}')
   GROUP BY Field,Tbl, NOTNULL, DFLT_VALUE, Pos ORDER BY Tbl,Pos;`;
}

export function selectAllRecordsQuery(tableName: string): string {
  return `SELECT * FROM ${tableName};`;
}

export function dropTableQuery(tableName: string): string {
  return `DROP TABLE ${tableName};`;
}

export const databaseInfoQry: string = `
  SELECT RDB$GET_CONTEXT('SYSTEM', 'DB_NAME'         ) AS DB_NAME,
         RDB$GET_CONTEXT('SYSTEM', 'ENGINE_VERSION'  ) AS ENGINE_VERSION, 
         RDB$GET_CONTEXT('SYSTEM', 'NETWORK_PROTOCOL') AS NETWORK_PROTOCOL,
         RDB$GET_CONTEXT('SYSTEM', 'CLIENT_ADDRESS'  ) AS CLIENT_ADDRESS,
         RDB$GET_CONTEXT('SYSTEM', 'ISOLATION_LEVEL' ) AS ISOLATION_LEVEL,
         RDB$GET_CONTEXT('SYSTEM', 'TRANSACTION_ID'  ) AS TRANSACTION_ID,
         RDB$GET_CONTEXT('SYSTEM', 'SESSION_ID'      ) AS SESSION_ID,
         RDB$GET_CONTEXT('SYSTEM', 'CURRENT_USER'    ) AS CRNT_USER,
         RDB$GET_CONTEXT('SYSTEM', 'CURRENT_ROLE'    ) AS CRNT_ROLE
    FROM RDB$DATABASE;`;

export function selectAllFieldRecordsQuery(fieldName: string, tableName: string): string {
  return `SELECT ${fieldName} FROM ${tableName}`;
}
