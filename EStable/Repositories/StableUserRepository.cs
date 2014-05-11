using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Web;
using EStable.Models;
using EStable.Models.Wizard;
using MySql.Data.MySqlClient;


namespace EStable.Repositories
{
    public class StableUserRepository
    {
        public void SaveStableUser(StableUser model)
        {
            try
            {
                using (var conn = new MySqlConnection(ConfigurationManager.ConnectionStrings["EStable"].ConnectionString))
                {
                    conn.Open();
                    var command = new MySqlCommand("sp_Add_Stable_User", conn)
                    {
                        CommandType = System.Data.CommandType.StoredProcedure
                    };

                    command.Parameters.Add(new MySqlParameter("inp_User_ID", model.UserId));
                    command.Parameters.Add(new MySqlParameter("inp_Stable_ID", model.StableID));
                    command.Parameters.Add(new MySqlParameter("Invite_Expires", model.InviteExpires));
                    command.Parameters.Add(new MySqlParameter("Activate_Ind", model.Active));
                      
                    command.ExecuteScalar();
                }

            }
            catch (Exception ex)
            {
                Console.WriteLine("failed to save " + model.UserId + " to the database\n" + ex);
            }
        }

        public void SaveUserOfStablePortal(UserOfStablePortal model)
        {
            using (var conn = new MySqlConnection(ConfigurationManager.ConnectionStrings["EStable"].ConnectionString))
            {
                conn.Open();
                var command = new MySqlCommand("sp_Add_User_of_Stable_Portal", conn)
                {
                    CommandType = System.Data.CommandType.StoredProcedure
                };

                command.Parameters.Add(new MySqlParameter("inp_User_Email", model.Email));
                command.Parameters.Add(new MySqlParameter("inp_Passwrd", model.Password));
                command.Parameters.Add(new MySqlParameter("inp_Active_Ind", model.Active));
                command.Parameters.Add(new MySqlParameter("inp_Force_PW_Change", model.ForcePWChange));

                command.ExecuteScalar();
            }
        }

        public int GetNewStableID()
        {
            var nextID = 0;
            using (var conn = new MySqlConnection(ConfigurationManager.ConnectionStrings["EStable"].ConnectionString))
            {
                conn.Open();
                var command = new MySqlCommand("SELECT MAX(stable_ID) FROM tbl_stable");
                using (MySqlDataReader reader = command.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        nextID = reader.GetInt32(0) +1;
                    }
                }
            }
            return nextID;
        }

        public int GetNewStableUserID()
        {
            var nextID = 0;
            using (var conn = new MySqlConnection(ConfigurationManager.ConnectionStrings["EStable"].ConnectionString))
            {
                conn.Open();
                var command = new MySqlCommand("SELECT MAX(User_ID) FROM tbl_stable_user");
                using (MySqlDataReader reader = command.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        nextID = reader.GetInt32(0) + 1;
                    }
                }
            }
            return nextID;
        }
    }
}