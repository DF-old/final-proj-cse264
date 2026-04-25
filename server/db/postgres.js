import pg from 'pg'
const { Client } = pg
 
// Keep one shared database connection for the server process so route handlers
// can focus on data logic instead of connection management.
const client = new Client({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DBNAME,
  user: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
})

client.connect()

export const query = async (text, values) => {
    try{
        const now = new Date()
        // Log the SQL text and elapsed time to make backend behavior easier to trace during demos.
        console.log("query to be executed:", text)
        const res = await client.query(text, values)
        const now2 = new Date()
        console.log(`it took ${now2-now}ms to run`)
        return res
    } catch (err) {
        console.error("Problem executing query")
        console.error(err)
        throw err
    }
}

/* 
HOW TO USE
    query(qs).then(data) => {res.json(data.rows)}
*/
