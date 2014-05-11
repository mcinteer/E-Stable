using System.Configuration;
using EStable.Constants;
using EStable.Domain;
using MySql.Data.MySqlClient;

namespace EStable.Repositories
{
    public class WizardRepository
    {
        public WizardRepository()
        {
            
        }
        public void SaveFileRegFileName(string newFileName, string email)
        {
            using (var conn = new MySqlConnection(ConfigurationManager.ConnectionStrings["EStable"].ConnectionString))
            {
                conn.Open();
                var cmd = new MySqlCommand("sp_Add_File_Obfuscation", conn)
                    {
                        CommandType = System.Data.CommandType.StoredProcedure
                    };

                cmd.Parameters.Add(new MySqlParameter("inp_Email_Address", email));
                cmd.Parameters.Add(new MySqlParameter("inp_Sys_Filename", newFileName));
                cmd.Parameters.Add(new MySqlParameter("inp_Usr_Filename", "Stable Registration.xml"));
                cmd.Parameters.Add(new MySqlParameter("inp_File_Type", Codes.FileType.StableRegistration));

                cmd.ExecuteScalar();
            }
        }

        public GetStableRegFileInfoResponse GetStableRegFileInfo(string email)
        {
            var response = new GetStableRegFileInfoResponse(){EmailAddress = email};
            using (var conn = new MySqlConnection(ConfigurationManager.ConnectionStrings["EStable"].ConnectionString))
            {
                conn.Open();
                var cmd = new MySqlCommand("sp_Get_File_Obfuscation", conn)
                    {
                        CommandType = System.Data.CommandType.StoredProcedure
                    };

                cmd.Parameters.Add(new MySqlParameter("inp_Email_Address", email));
                cmd.Parameters.Add(new MySqlParameter("inp_File_Type", Codes.FileType.StableRegistration));

                using (MySqlDataReader reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        response.SystemFileName = reader.GetString("Sys_Filename");
                        response.UserFileName = reader.GetString("Usr_Filename");
                    }
                }
            }
            return response;
        }
    }
}