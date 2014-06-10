using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Linq;
using System.Web;
using EStable.Constants;
using EStable.Models;
using MySql.Data.MySqlClient;

namespace EStable.Repositories
{
    public class UserOfStableRepository
    {
        public void Save(UserOfStablePortal userOfStable)
        {
            try
            {
                using (var conn = new MySqlConnection(ConfigurationManager.ConnectionStrings["EStable"].ConnectionString))
                {
                    conn.Open();
                    var command = new MySqlCommand(Codes.StoredProcedure.AddUserOfStable.Name, conn)
                    {
                        CommandType = System.Data.CommandType.StoredProcedure
                    };

                    command.Parameters.Add(new MySqlParameter(Codes.StoredProcedure.AddUserOfStable.Email, userOfStable.Email));
                    command.Parameters.Add(new MySqlParameter(Codes.StoredProcedure.AddUserOfStable.FirstName, userOfStable.FirstName));
                    command.Parameters.Add(new MySqlParameter(Codes.StoredProcedure.AddUserOfStable.LastName, userOfStable.LastName));
                    command.Parameters.Add(new MySqlParameter(Codes.StoredProcedure.AddUserOfStable.Password, userOfStable.Password));
                    command.Parameters.Add(new MySqlParameter(Codes.StoredProcedure.AddUserOfStable.Active, userOfStable.Active));
                    command.Parameters.Add(new MySqlParameter(Codes.StoredProcedure.AddUserOfStable.ForcePWChange, userOfStable.ForcePWChange));
                    command.Parameters.Add(new MySqlParameter(Codes.StoredProcedure.AddUserOfStable.LastAccessedStableId, userOfStable.LastAccessedStableId));

                    command.ExecuteScalar();
                }

            }
            catch (Exception ex)
            {
                Console.WriteLine("failed to save " + userOfStable.Email + " to the database\n" + ex);
            }
        }

        public UserOfStablePortal GetByStableTypeAndEmail(char stableType, string email)
        {
            try
            {
                var userOfStable = new UserOfStablePortal();
                using (var conn = new MySqlConnection(ConfigurationManager.ConnectionStrings["EStable"].ConnectionString))
                {
                    conn.Open();
                    var command = new MySqlCommand(Codes.StoredProcedure.GetUserOfStableByEmail.Name, conn)
                    {
                        CommandType = System.Data.CommandType.StoredProcedure
                    };

                    command.Parameters.Add(new MySqlParameter(Codes.StoredProcedure.GetUserOfStableByEmail.StableType, stableType));
                    command.Parameters.Add(new MySqlParameter(Codes.StoredProcedure.GetUserOfStableByEmail.Email, email));


                    DataTable dt = new DataTable();
                    using (var reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            try{userOfStable.UserId = reader.GetInt32(0);}
                            catch (Exception){}
                            try{userOfStable.Email = reader.GetString(1);}
                            catch (Exception){}
                            try{userOfStable.Password = reader.GetString(2);}
                            catch (Exception){}
                            try{userOfStable.Active = reader.GetString(3);}
                            catch (Exception){}
                            try{userOfStable.ForcePWChange = reader.GetString(4);}
                            catch (Exception){} 
                            try{userOfStable.LastAccessedStableId = reader.GetInt32(5);}
                            catch (Exception){}
                            
                        }
                        else
                        {
                            return null;
                        }
                    }
                    

                }
                return userOfStable;
            }
            catch (Exception ex)
            {
                Console.WriteLine("failed to get " + email + " from the database\n" + ex);
                return null;
            }
        }
    }
}